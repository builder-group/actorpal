//! NSWorkspace monitoring for app switches
//!
//! This module uses NSWorkspace notifications via objc2-app-kit to detect when
//! the user switches between applications. It uses objc2's `define_class!` with
//! instance variables to store the handler, eliminating the need for global state.

use std::cell::RefCell;

use objc2::rc::Retained;
use objc2::runtime::ProtocolObject;
use objc2::{define_class, msg_send, DefinedClass, MainThreadMarker, MainThreadOnly};
use objc2_app_kit::{
    NSApplication, NSApplicationDelegate, NSRunningApplication, NSWorkspace,
    NSWorkspaceApplicationKey, NSWorkspaceDidActivateApplicationNotification,
};
use objc2_foundation::{NSNotification, NSObject, NSObjectProtocol};

use crate::error::Error;
use crate::types::AppInfo;

use super::accessibility;
use super::event_context::EventContext;

/// Instance variables for the workspace delegate
struct WorkspaceDelegateIvars {
    context: EventContext,
    accessibility_monitor: RefCell<Option<accessibility::AccessibilityMonitor>>,
}

define_class!(
    // SAFETY:
    // - The superclass NSObject does not have any subclassing requirements.
    // - `WorkspaceDelegate` does not implement `Drop`.
    #[unsafe(super = NSObject)]
    #[thread_kind = MainThreadOnly]
    #[ivars = WorkspaceDelegateIvars]
    struct WorkspaceDelegate;

    // SAFETY: `NSObjectProtocol` has no safety requirements.
    unsafe impl NSObjectProtocol for WorkspaceDelegate {}

    // SAFETY: `NSApplicationDelegate` has no safety requirements.
    unsafe impl NSApplicationDelegate for WorkspaceDelegate {
        // SAFETY: The signature is correct.
        #[unsafe(method(applicationDidFinishLaunching:))]
        fn did_finish_launching(&self, _notification: &NSNotification) {
            // Initialize accessibility monitor for current app
            if self.ivars().context.config().track_window_changes {
                if let Some(pid) = get_current_pid() {
                    if let Ok(monitor) = accessibility::AccessibilityMonitor::new(self.ivars().context.clone(), pid) {
                        *self.ivars().accessibility_monitor.borrow_mut() = Some(monitor);
                    }
                }
            }
        }
    }

    impl WorkspaceDelegate {
        /// Handle app activation notification
        #[unsafe(method(didActivateApplication:))]
        fn did_activate_application(&self, notification: &NSNotification) {
            if let Some(app_info) = extract_app_from_notification(notification) {
                let context = &self.ivars().context;

                // Stop old accessibility monitor
                if let Some(mut old_monitor) = self.ivars().accessibility_monitor.borrow_mut().take() {
                    let _ = old_monitor.stop();
                }

                // Create accessibility observer for the new app
                if context.config().track_window_changes {
                    if let Ok(monitor) = accessibility::AccessibilityMonitor::new(context.clone(), app_info.pid) {
                        *self.ivars().accessibility_monitor.borrow_mut() = Some(monitor);
                    }
                }

                // Send focus change event
                // window_change_callback only fires for window/title changes within an app,
                // not for app switches themselves, so we need to send the event here
                // Use build_window_info for efficiency (we already have app_info)
                if let Some(window) = crate::platform::macos::window_info::build_window_info(
                    app_info.pid,
                    String::new(), // Title will be empty initially, but window_id check will handle it
                    Some(app_info.clone()),
                ) {
                    // Skip if window state isn't ready yet (e.g., after unminimizing)
                    // The Accessibility observer will report it when the window becomes ready
                    if window.window_id != 0 {
                        context.handle(window);
                    }
                }
            }
        }
    }
);

impl WorkspaceDelegate {
    fn new(context: EventContext, mtm: MainThreadMarker) -> Retained<Self> {
        use std::cell::RefCell;
        let this = Self::alloc(mtm).set_ivars(WorkspaceDelegateIvars {
            context,
            accessibility_monitor: RefCell::new(None),
        });
        // SAFETY: The signature of `NSObject`'s `init` method is correct.
        unsafe { msg_send![super(this), init] }
    }
}

/// Monitor for app switches using NSWorkspace
pub struct WorkspaceMonitor {
    delegate: Retained<WorkspaceDelegate>,
    app: Retained<NSApplication>,
}

impl WorkspaceMonitor {
    pub fn new(context: EventContext) -> Result<Self, Error> {
        let mtm = MainThreadMarker::new()
            .ok_or_else(|| Error::Platform("Not on main thread".to_string()))?;

        let delegate = WorkspaceDelegate::new(context, mtm);
        let app = NSApplication::sharedApplication(mtm);

        return Ok(Self { delegate, app });
    }

    pub fn context(&self) -> &EventContext {
        &self.delegate.ivars().context
    }

    pub fn start(&mut self) -> Result<(), Error> {
        unsafe {
            let workspace = NSWorkspace::sharedWorkspace();
            let center = workspace.notificationCenter();

            // Subscribe to app activation notifications
            center.addObserver_selector_name_object(
                self.delegate.as_ref(),
                objc2::sel!(didActivateApplication:),
                Some(NSWorkspaceDidActivateApplicationNotification),
                Some(workspace.as_ref()),
            );

            // Set app delegate
            let delegate_obj = ProtocolObject::from_ref(&*self.delegate);
            self.app.setDelegate(Some(delegate_obj));
        }

        return Ok(());
    }

    pub fn run(&self) -> Result<(), Error> {
        // Run the NSApplication event loop
        // This blocks until the app is terminated
        self.app.run();
        return Ok(());
    }

    pub fn stop() {
        // Stop the NSApplication run loop
        // This needs to be called from the main thread
        if let Some(mtm) = MainThreadMarker::new() {
            let app = NSApplication::sharedApplication(mtm);
            app.terminate(None);
        }
    }
}

/// Extract app information from an NSNotification
fn extract_app_from_notification(notification: &NSNotification) -> Option<AppInfo> {
    let user_info = notification.userInfo()?;
    let app_key = unsafe { NSWorkspaceApplicationKey };
    let app_any = user_info.objectForKey(app_key)?;
    let app: Retained<NSRunningApplication> = app_any.downcast().ok()?;

    let pid = app.processIdentifier();
    let name = app
        .localizedName()
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let bundle_id = app
        .bundleIdentifier()
        .map(|s| s.to_string())
        .unwrap_or_default();
    let process_path = get_process_path(pid).unwrap_or_default();

    return Some(AppInfo {
        pid,
        name,
        bundle_id,
        process_path,
    });
}

/// Get current frontmost app PID
pub fn get_current_pid() -> Option<i32> {
    let workspace = NSWorkspace::sharedWorkspace();
    let app = workspace.frontmostApplication()?;
    return Some(app.processIdentifier());
}

/// Get app name by PID
pub fn get_app_name(pid: i32) -> Option<String> {
    let app = NSRunningApplication::runningApplicationWithProcessIdentifier(pid)?;
    return app.localizedName().map(|s| s.to_string());
}

/// Get bundle ID by PID
pub fn get_bundle_id(pid: i32) -> Option<String> {
    let app = NSRunningApplication::runningApplicationWithProcessIdentifier(pid)?;
    return app.bundleIdentifier().map(|s| s.to_string());
}

/// Get process path by PID using proc_pidpath system call
pub fn get_process_path(pid: i32) -> Option<String> {
    #[link(name = "proc")]
    extern "C" {
        fn proc_pidpath(pid: i32, buffer: *mut libc::c_char, buffersize: u32) -> i32;
    }

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
            return None;
        }
    }
}
