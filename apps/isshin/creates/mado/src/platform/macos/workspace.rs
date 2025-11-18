use super::{accessibility, window_handler::WindowHandler};
use crate::{error::Error, platform::macos::window_info::build_window_info, types::AppInfo};
use objc2::{
    define_class, msg_send, rc::Retained, runtime::ProtocolObject, DefinedClass, MainThreadMarker,
    MainThreadOnly,
};
use objc2_app_kit::{
    NSApplication, NSApplicationDelegate, NSRunningApplication, NSWorkspace,
    NSWorkspaceApplicationKey, NSWorkspaceDidActivateApplicationNotification,
};
use objc2_foundation::{NSNotification, NSObject, NSObjectProtocol};
use std::cell::RefCell;

/// Instance variables for the workspace delegate
struct WorkspaceDelegateIvars {
    handler: WindowHandler,
    accessibility_monitor: RefCell<Option<accessibility::AccessibilityMonitor>>,
    am_retry_count: RefCell<u32>,
    am_retry_pid: RefCell<Option<i32>>,
}

define_class!(
    #[unsafe(super = NSObject)]
    #[thread_kind = MainThreadOnly]
    #[ivars = WorkspaceDelegateIvars]
    struct WorkspaceDelegate;

    unsafe impl NSObjectProtocol for WorkspaceDelegate {}

    unsafe impl NSApplicationDelegate for WorkspaceDelegate {
        /// Called once when NSApplication finishes launching (initial setup).
        #[unsafe(method(applicationDidFinishLaunching:))]
        fn did_finish_launching(&self, _notification: &NSNotification) {
            if !self.ivars().handler.config().track_window_changes {
                return;
            }

            if let Some(pid) = get_current_pid() {
                Self::create_accessibility_monitor(self, self.ivars().handler.clone(), pid);
            }
        }
    }

    impl WorkspaceDelegate {
        /// Called when user switches to a different application.
        #[unsafe(method(didActivateApplication:))]
        fn did_activate_application(&self, notification: &NSNotification) {
            let app_info = match extract_app_from_notification(notification) {
                Some(info) => info,
                None => return,
            };
            let handler = &self.ivars().handler;

            // Stop accessibility monitor for previous app
            if let Some(mut old_monitor) = self.ivars().accessibility_monitor.borrow_mut().take() {
                let _ = old_monitor.stop();
            }

              // Create accessibility monitor for new app
            if handler.config().track_window_changes {
                Self::create_accessibility_monitor(self, handler.clone(), app_info.pid);
            }

            // Accessibility API only fires for window/title changes within an app,
            // not for app switches, so we must send the event here
            let window_info = match build_window_info(
                app_info.pid,
                None,
                Some(app_info),
            ) {
                Some(window) => window,
                None => return,
            };
            handler.handle(window_info);
        }

        /// Retry callback to create accessibility monitor for a new app.
        #[unsafe(method(retryAccessibilityMonitor))]
        fn retry_accessibility_monitor(&self) {
            let retry_pid = *self.ivars().am_retry_pid.borrow();
            let current_pid = get_current_pid();

            // Only retry if the PID we're retrying for is still the current app.
            // This prevents retries from previous apps interfering with new apps.
            if let (Some(stored_pid), Some(current)) = (retry_pid, current_pid) {
                if stored_pid == current {
                    Self::try_create_accessibility_monitor(self, self.ivars().handler.clone(), current);
                }
            }
        }
    }
);

impl WorkspaceDelegate {
    fn new(handler: WindowHandler, mtm: MainThreadMarker) -> Retained<Self> {
        let this = Self::alloc(mtm).set_ivars(WorkspaceDelegateIvars {
            handler,
            accessibility_monitor: RefCell::new(None),
            am_retry_count: RefCell::new(0),
            am_retry_pid: RefCell::new(None),
        });
        unsafe { msg_send![super(this), init] }
    }

    /// Create accessibility monitor for a new app.
    fn create_accessibility_monitor(delegate: &Self, handler: WindowHandler, pid: i32) {
        *delegate.ivars().am_retry_count.borrow_mut() = 0;
        *delegate.ivars().am_retry_pid.borrow_mut() = None;
        Self::try_create_accessibility_monitor(delegate, handler, pid);
    }

    /// Try to create accessibility monitor, with retry.
    ///
    /// Retries up to 3 times with exponential backoff (200ms, 400ms, 800ms).
    fn try_create_accessibility_monitor(delegate: &Self, handler: WindowHandler, pid: i32) {
        match accessibility::AccessibilityMonitor::new(handler.clone(), pid) {
            Ok(monitor) => {
                *delegate.ivars().accessibility_monitor.borrow_mut() = Some(monitor);
                *delegate.ivars().am_retry_count.borrow_mut() = 0;
                *delegate.ivars().am_retry_pid.borrow_mut() = None;
            }
            Err(Error::Platform(msg)) => {
                match msg.as_str() {
                    // kAXErrorCannotComplete - app not ready yet, retry
                    s if s.contains("-25204") => {
                        let retry_count = *delegate.ivars().am_retry_count.borrow();
                        if retry_count < 3 {
                            *delegate.ivars().am_retry_count.borrow_mut() = retry_count + 1;
                            *delegate.ivars().am_retry_pid.borrow_mut() = Some(pid);
                            let delay = 0.2 * (2.0_f64).powf(retry_count as f64);
                            unsafe {
                                msg_send![delegate, performSelector: objc2::sel!(retryAccessibilityMonitor), withObject: None::<&NSObject>, afterDelay: delay]
                            }
                            return;
                        }
                    }
                    _ => {}
                }

                *delegate.ivars().am_retry_count.borrow_mut() = 0;
                *delegate.ivars().am_retry_pid.borrow_mut() = None;
                eprintln!(
                    "[WorkspaceMonitor] Failed to create accessibility monitor (PID {}): {}",
                    pid, msg
                );
            }
            Err(e) => {
                *delegate.ivars().am_retry_count.borrow_mut() = 0;
                *delegate.ivars().am_retry_pid.borrow_mut() = None;
                eprintln!(
                    "[WorkspaceMonitor] Failed to create accessibility monitor (PID {}): {}",
                    pid, e
                );
            }
        }
    }
}

/// Monitor for app switches using NSWorkspace.
///
/// Coordinates with AccessibilityMonitor to track window changes:
/// - Detects app switches via NSWorkspace notifications
/// - Creates/removes AccessibilityMonitor instances per app
/// - Sends window events for app switches (Accessibility API doesn't fire on app switch)
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
    /// let monitor = WorkspaceMonitor::new(handler)?;
    ///
    /// // Or on a dedicated AppKit thread
    /// std::thread::spawn(move || {
    ///     let mut monitor = WorkspaceMonitor::new(handler)?;
    ///     monitor.run()?;
    ///     Ok::<(), Error>(())
    /// });
    /// ```
    pub fn new(handler: WindowHandler) -> Result<Self, Error> {
        // SAFETY: Safe when called from main thread or dedicated AppKit thread (as documented)
        let mtm = unsafe { MainThreadMarker::new_unchecked() };

        let delegate = WorkspaceDelegate::new(handler, mtm);
        let app = NSApplication::sharedApplication(mtm);

        return Ok(Self {
            delegate,
            app,
            is_running: false,
        });
    }

    pub fn handler(&self) -> &WindowHandler {
        return &self.delegate.ivars().handler;
    }

    /// Start monitoring and run the NSApplication event loop.
    ///
    /// Sets up NSWorkspace notifications and blocks until `stop()` is called.
    pub fn run(&mut self) -> Result<(), Error> {
        if self.is_running {
            return Err(Error::AlreadyRunning);
        }

        let workspace = NSWorkspace::sharedWorkspace();
        let center = workspace.notificationCenter();

        // Subscribe to app activation notifications
        unsafe {
            center.addObserver_selector_name_object(
                self.delegate.as_ref(),
                objc2::sel!(didActivateApplication:),
                Some(NSWorkspaceDidActivateApplicationNotification),
                Some(workspace.as_ref()),
            );
        }

        let delegate_obj = ProtocolObject::from_ref(&*self.delegate);
        self.app.setDelegate(Some(delegate_obj));

        self.is_running = true;
        self.app.run(); // Blocks until terminated
        self.cleanup();

        return Ok(());
    }

    fn cleanup(&mut self) {
        if !self.is_running {
            return;
        }

        let workspace = NSWorkspace::sharedWorkspace();
        let center = workspace.notificationCenter();
        unsafe {
            center.removeObserver(self.delegate.as_ref());
        }

        self.is_running = false;
    }

    /// Stop the NSApplication event loop (thread-safe, idempotent).
    pub fn stop() {
        // SAFETY: terminate() is thread-safe and idempotent.
        // new_unchecked() is safe because terminate() works from any thread, not just the AppKit thread.
        let mtm = unsafe { MainThreadMarker::new_unchecked() };
        let app = NSApplication::sharedApplication(mtm);
        app.terminate(None);
    }
}

/// Extract AppInfo from NSWorkspace activation notification.
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

/// Get PID of the currently frontmost application.
pub fn get_current_pid() -> Option<i32> {
    let workspace = NSWorkspace::sharedWorkspace();
    let app = workspace.frontmostApplication()?;
    return Some(app.processIdentifier());
}

/// Get localized name of application by PID.
pub fn get_app_name(pid: i32) -> Option<String> {
    let app = NSRunningApplication::runningApplicationWithProcessIdentifier(pid)?;
    return app.localizedName().map(|s| s.to_string());
}

/// Get bundle identifier of application by PID.
pub fn get_bundle_id(pid: i32) -> Option<String> {
    let app = NSRunningApplication::runningApplicationWithProcessIdentifier(pid)?;
    return app.bundleIdentifier().map(|s| s.to_string());
}

/// Get process executable path by PID (uses proc_pidpath system call).
///
/// Returns canonicalized path if possible, otherwise returns the raw path.
pub fn get_process_path(pid: i32) -> Option<String> {
    #[link(name = "proc")]
    extern "C" {
        fn proc_pidpath(pid: i32, buffer: *mut libc::c_char, buffersize: u32) -> i32;
    }

    let mut buf = vec![0 as libc::c_char; 4096];
    let ret = unsafe { proc_pidpath(pid, buf.as_mut_ptr(), 4096) };

    if ret <= 0 {
        return None;
    }

    let path_str = unsafe { std::ffi::CStr::from_ptr(buf.as_ptr()) }
        .to_str()
        .ok()?;
    return std::fs::canonicalize(path_str)
        .ok()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .or_else(|| Some(path_str.to_string()));
}
