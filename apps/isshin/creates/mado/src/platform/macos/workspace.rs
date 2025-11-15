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
                    match accessibility::AccessibilityMonitor::new(self.ivars().context.clone(), pid) {
                        Ok(monitor) => {
                            *self.ivars().accessibility_monitor.borrow_mut() = Some(monitor);
                        }
                        Err(e) => {
                            eprintln!("[WorkspaceMonitor] Failed to create accessibility monitor for PID {}: {}", pid, e);
                        }
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
                    match accessibility::AccessibilityMonitor::new(context.clone(), app_info.pid) {
                        Ok(monitor) => {
                            *self.ivars().accessibility_monitor.borrow_mut() = Some(monitor);
                        }
                        Err(e) => {
                            eprintln!(
                                "[WorkspaceMonitor] Failed to create accessibility monitor for app {} (PID {}): {}",
                                app_info.name, app_info.pid, e
                            );
                        }
                    }
                }

                // Send focus change event
                // window_change_callback only fires for window/title changes within an app,
                // not for app switches themselves, so we need to send the event here
                if let Some(window) = crate::platform::macos::window_info::build_window_info(
                    app_info.pid,
                    None,
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
    is_running: bool,
}

impl WorkspaceMonitor {
    /// Create a new WorkspaceMonitor
    ///
    /// # Threading Requirements
    ///
    /// This must be called from either:
    /// - The main thread, or
    /// - A dedicated thread that runs AppKit code (e.g., a spawned thread that will run `NSApplication`)
    ///
    /// This function uses `MainThreadMarker::new_unchecked()` internally, which is safe as long as
    /// the calling thread is dedicated to AppKit operations and will not be used for other purposes.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// // On main thread
    /// let monitor = WorkspaceMonitor::new(context)?;
    ///
    /// // Or on a dedicated AppKit thread
    /// std::thread::spawn(move || {
    ///     let mut monitor = WorkspaceMonitor::new(context)?;
    ///     monitor.run()?;
    ///     Ok::<(), Error>(())
    /// });
    /// ```
    pub fn new(context: EventContext) -> Result<Self, Error> {
        // SAFETY: Safe when called from main thread or dedicated AppKit thread (as documented)
        let mtm = unsafe { MainThreadMarker::new_unchecked() };

        let delegate = WorkspaceDelegate::new(context, mtm);
        let app = NSApplication::sharedApplication(mtm);

        return Ok(Self {
            delegate,
            app,
            is_running: false,
        });
    }

    pub fn context(&self) -> &EventContext {
        return &self.delegate.ivars().context;
    }

    /// Start monitoring and run the NSApplication event loop.
    ///
    /// This sets up NSWorkspace notifications and then blocks until the app is terminated.
    /// This blocks until `stop()` is called.
    pub fn run(&mut self) -> Result<(), Error> {
        if self.is_running {
            return Err(Error::Platform("Monitor is already running".to_string()));
        }

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

        self.is_running = true;

        // Run the NSApplication event loop (blocks until terminated)
        self.app.run();

        // Clean up after run loop exits
        self.cleanup();

        return Ok(());
    }

    /// Clean up observers and reset state
    fn cleanup(&mut self) {
        if !self.is_running {
            return;
        }

        unsafe {
            let workspace = NSWorkspace::sharedWorkspace();
            let center = workspace.notificationCenter();

            // Remove NSWorkspace observer
            center.removeObserver(self.delegate.as_ref());
        }

        self.is_running = false;
    }

    /// Stop the NSApplication event loop.
    ///
    /// This can be called from any thread. It terminates the NSApplication,
    /// which will cause `run()` to return. This method is idempotent - calling it
    /// multiple times is safe.
    pub fn stop() {
        // SAFETY: NSApplication::terminate() is thread-safe and can be called from any thread.
        // We use new_unchecked() because stop() may be called from a thread that's not
        // the main thread or the AppKit thread, but terminate() will still work correctly.
        // terminate() is idempotent, so calling it multiple times is safe.
        let mtm = unsafe { MainThreadMarker::new_unchecked() };
        let app = NSApplication::sharedApplication(mtm);
        app.terminate(None);
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
    let process_path = get_process_path(pid).unwrap_or_else(|| {
        eprintln!(
            "[WorkspaceMonitor] Failed to get process path for PID {}",
            pid
        );
        String::new()
    });

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
///
/// Returns `None` if the process path cannot be retrieved.
/// Logs errors for debugging purposes.
pub fn get_process_path(pid: i32) -> Option<String> {
    #[link(name = "proc")]
    extern "C" {
        fn proc_pidpath(pid: i32, buffer: *mut libc::c_char, buffersize: u32) -> i32;
    }

    unsafe {
        let mut buf = vec![0 as libc::c_char; 4096];
        let ret = proc_pidpath(pid, buf.as_mut_ptr(), 4096);

        if ret > 0 {
            return std::ffi::CStr::from_ptr(buf.as_ptr())
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
                });
        } else {
            return None;
        }
    }
}
