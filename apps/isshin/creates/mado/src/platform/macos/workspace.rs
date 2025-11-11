//! NSWorkspace monitoring for app switches
//!
//! This module uses NSWorkspace notifications to detect when the user switches
//! between applications. It's the primary mechanism for app-level monitoring.
//!
//! ## Why Unsafe?
//!
//! We use Objective-C APIs through the objc2 crate, which requires:
//! - FFI calls to AppKit framework
//! - Creating Objective-C classes at runtime
//! - Handling raw Objective-C objects and pointers
//!
//! ## Architecture
//!
//! 1. We create a custom Objective-C class (AppMonitorObserver) that implements
//!    the notification callback method
//! 2. We register this observer with NSWorkspace's notification center
//! 3. When an app activates, the callback fires and we invoke the Rust handler

use std::ffi::CStr;
use std::ptr;

use core_foundation::base::TCFType;
use core_foundation::runloop::CFRunLoop;
use core_foundation::string::CFString;
use objc2::runtime::{AnyObject, ClassBuilder, Sel};
use objc2::{class, msg_send, sel};

use crate::config::MonitorConfig;
use crate::error::Error;
use crate::types::AppInfo;

use super::global_state;

// Link to AppKit framework (required for NSWorkspace)
#[link(name = "AppKit", kind = "framework")]
extern "C" {}

// Link to libproc for process path information
#[link(name = "proc")]
extern "C" {
    fn proc_pidpath(pid: i32, buffer: *mut libc::c_char, buffersize: u32) -> i32;
}

/// Monitor for app switches using NSWorkspace
pub struct WorkspaceMonitor {
    _config: MonitorConfig,
}

impl WorkspaceMonitor {
    pub fn new(_config: MonitorConfig) -> Self {
        Self { _config }
    }

    pub fn start(&self) -> Result<(), Error> {
        setup_notifications()
    }

    pub fn run(&self) -> Result<(), Error> {
        let run_loop = CFRunLoop::get_current();
        global_state::set_run_loop(run_loop.clone());

        CFRunLoop::run_current();

        global_state::clear_all();
        Ok(())
    }

    pub fn stop() -> Result<(), Error> {
        global_state::stop_run_loop();
        Ok(())
    }
}

/// Setup NSWorkspace notifications for app activation
fn setup_notifications() -> Result<(), Error> {
    unsafe {
        // Objective-C callbacks can't capture Rust closures, so we create a custom class
        let class_name = CStr::from_bytes_with_nul(b"AppMonitorObserver\0")
            .map_err(|_| Error::Platform("Invalid class name".to_string()))?;
        let mut decl = ClassBuilder::new(class_name, class!(NSObject))
            .ok_or_else(|| Error::Platform("Failed to create observer class".to_string()))?;

        extern "C" fn app_did_activate(_this: &AnyObject, _cmd: Sel, notification: *mut AnyObject) {
            unsafe {
                if notification.is_null() {
                    return;
                }

                let handler = match global_state::get_handler() {
                    Some(h) => h,
                    None => return,
                };

                if let Some(app_info) = extract_app(notification) {
                    // NSWorkspace tells us about app switches, Accessibility API tells us about windows
                    if let Err(e) =
                        crate::platform::macos::accessibility::AccessibilityMonitor::create_for_app(
                            app_info.pid,
                        )
                    {
                        eprintln!("Failed to create accessibility observer: {:?}", e);
                    }

                    // Send focus change event
                    // window_change_callback only fires for window/title changes within an app,
                    // not for app switches themselves, so we need to send the event here
                    if let Some(window) = crate::platform::macos::window_info::get_current_window()
                    {
                        // Skip if window state isn't ready yet (e.g., after unminimizing)
                        // The Accessibility observer will report it when the window becomes ready
                        if window.window_id != 0 {
                            if let Ok(guard) = handler.read() {
                                guard.on_focus_change(window);
                            }
                        }
                    }
                }
            }
        }

        decl.add_method(
            sel!(applicationDidActivate:),
            app_did_activate as extern "C" fn(_, _, _),
        );

        let observer: *mut AnyObject = msg_send![decl.register(), alloc];
        let observer: *mut AnyObject = msg_send![observer, init];

        let workspace: *mut AnyObject = msg_send![class!(NSWorkspace), sharedWorkspace];
        let center: *mut AnyObject = msg_send![workspace, notificationCenter];
        let name = CFString::from_static_string("NSWorkspaceDidActivateApplicationNotification");
        let name_obj: *mut AnyObject = name.as_concrete_TypeRef() as *mut AnyObject;

        let _: () = msg_send![
            center,
            addObserver: observer,
            selector: sel!(applicationDidActivate:),
            name: name_obj,
            object: ptr::null_mut::<AnyObject>()
        ];

        Ok(())
    }
}

/// Extract app information from an NSNotification
unsafe fn extract_app(notification: *mut AnyObject) -> Option<AppInfo> {
    let user_info: *mut AnyObject = msg_send![notification, userInfo];
    if user_info.is_null() {
        return None;
    }

    let app_key = CFString::from_static_string("NSWorkspaceApplicationKey");
    let app_key_obj: *mut AnyObject = app_key.as_concrete_TypeRef() as *mut AnyObject;
    let app: *mut AnyObject = msg_send![user_info, objectForKey: app_key_obj,];
    if app.is_null() {
        return None;
    }

    let pid: i32 = msg_send![app, processIdentifier];
    let name = extract_app_name(app);
    let bundle_id = extract_bundle_id(app).unwrap_or_default();
    let process_path = get_process_path(pid).unwrap_or_default();

    Some(AppInfo {
        pid,
        name,
        bundle_id,
        process_path,
    })
}

/// Extract the localized app name from an NSRunningApplication
unsafe fn extract_app_name(app: *mut AnyObject) -> String {
    let name: *mut AnyObject = msg_send![app, localizedName];
    if name.is_null() {
        return "Unknown".to_string();
    }

    let str_ptr: *const std::ffi::c_char = msg_send![name, UTF8String];
    if str_ptr.is_null() {
        return "Unknown".to_string();
    }

    std::ffi::CStr::from_ptr(str_ptr)
        .to_str()
        .map(|s| s.to_string())
        .unwrap_or_else(|_| "Unknown".to_string())
}

/// Extract the bundle ID from an NSRunningApplication
unsafe fn extract_bundle_id(app: *mut AnyObject) -> Option<String> {
    let bundle_id: *mut AnyObject = msg_send![app, bundleIdentifier];
    if bundle_id.is_null() {
        return None;
    }

    let str_ptr: *const std::ffi::c_char = msg_send![bundle_id, UTF8String];
    if str_ptr.is_null() {
        return None;
    }

    std::ffi::CStr::from_ptr(str_ptr)
        .to_str()
        .map(|s| s.to_string())
        .ok()
}

/// Get current frontmost app PID
pub fn get_current_pid() -> Option<i32> {
    unsafe {
        let workspace: *mut AnyObject = msg_send![class!(NSWorkspace), sharedWorkspace];
        let app: *mut AnyObject = msg_send![workspace, frontmostApplication];
        if app.is_null() {
            None
        } else {
            Some(msg_send![app, processIdentifier])
        }
    }
}

/// Get app name by PID
pub fn get_app_name(pid: i32) -> Option<String> {
    unsafe {
        let app: *mut AnyObject = msg_send![
            class!(NSRunningApplication),
            runningApplicationWithProcessIdentifier: pid
        ];
        if app.is_null() {
            None
        } else {
            Some(extract_app_name(app))
        }
    }
}

/// Get bundle ID by PID
pub fn get_bundle_id(pid: i32) -> Option<String> {
    unsafe {
        let app: *mut AnyObject = msg_send![
            class!(NSRunningApplication),
            runningApplicationWithProcessIdentifier: pid
        ];
        if app.is_null() {
            return None;
        }
        extract_bundle_id(app)
    }
}

/// Get process path by PID using proc_pidpath system call
pub fn get_process_path(pid: i32) -> Option<String> {
    unsafe {
        let mut buf = vec![0 as libc::c_char; 4096];
        let ret = proc_pidpath(pid, buf.as_mut_ptr(), 4096);

        if ret > 0 {
            std::ffi::CStr::from_ptr(buf.as_ptr())
                .to_str()
                .ok()
                .and_then(|s| std::fs::canonicalize(s).ok())
                .and_then(|p| p.to_str().map(|s| s.to_string()))
                .or_else(|| {
                    // Fallback: return non-canonicalized path
                    std::ffi::CStr::from_ptr(buf.as_ptr())
                        .to_str()
                        .map(|s| s.to_string())
                        .ok()
                })
        } else {
            None
        }
    }
}
