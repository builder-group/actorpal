use super::{accessibility, app_info, window_event_handler::WindowEventHandler};
use crate::{
    error::Error,
    platform::macos::window_info,
    types::{AppInfo, WindowEvent},
};
use objc2::{
    define_class, msg_send, rc::Retained, runtime::ProtocolObject, DefinedClass, MainThreadMarker,
    MainThreadOnly,
};
use objc2_app_kit::{
    NSApplication, NSApplicationDelegate, NSWorkspace,
    NSWorkspaceDidActivateApplicationNotification,
};
use objc2_foundation::{NSNotification, NSObject, NSObjectProtocol};
use std::cell::RefCell;

/// Instance variables for the workspace delegate
struct WorkspaceDelegateIvars {
    event_handler: WindowEventHandler,
    accessibility_monitor: RefCell<Option<accessibility::AccessibilityMonitor>>,
    pid: RefCell<Option<i32>>,
    retry_count: RefCell<u32>,
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
            let app_info = match app_info::get_current_app() {
                Some(info) => info,
                None => return,
            };
            let event_handler = &self.ivars().event_handler;

            event_handler.handle(WindowEvent::AppActivated {
                app: app_info.clone(),
            });

            // Start polling for window info
            if event_handler.config().track_window_changes {
                *self.ivars().pid.borrow_mut() = Some(app_info.pid);
                *self.ivars().retry_count.borrow_mut() = 0;
                Self::poll_window_info(self, app_info.pid, app_info);
            }
        }
    }

    impl WorkspaceDelegate {
        /// Called when user switches to a different application.
        #[unsafe(method(didActivateApplication:))]
        fn did_activate_application(&self, notification: &NSNotification) {
            let app_info = match app_info::get_app_info_from_notification(notification) {
                Some(info) => info,
                None => return,
            };
            let event_handler = &self.ivars().event_handler;

            // Cleanup previous app (stop monitor and polling)
            if let Some(mut old_monitor) = self.ivars().accessibility_monitor.borrow_mut().take() {
                let _ = old_monitor.stop();
            }
            Self::stop_polling(self);

            // Always send AppActivated when app switches (explicit app change notification)
            event_handler.handle(WindowEvent::AppActivated {
                app: app_info.clone(),
            });

            // Start polling for window info
            if event_handler.config().track_window_changes {
                *self.ivars().pid.borrow_mut() = Some(app_info.pid);
                *self.ivars().retry_count.borrow_mut() = 0;
                Self::poll_window_info(self, app_info.pid, app_info.clone());
            }
        }

        /// Callback to continue polling for window info.
        #[unsafe(method(pollWindowInfo))]
        fn poll_window_info_callback(&self) {
            let stored_pid = *self.ivars().pid.borrow();
            let current_pid = app_info::get_current_pid();

            // Only retry if the PID we're retrying for is still the current app.
            // This prevents retries from previous apps interfering with new apps.
            if let (Some(pid), Some(current)) = (stored_pid, current_pid) {
                if pid == current {
                    if let Some(app_info) = app_info::get_app_info_from_pid(current) {
                        Self::poll_window_info(self, current, app_info);
                        return;
                    }
                }
            }

            Self::stop_polling(self);
        }
    }
);

impl WorkspaceDelegate {
    fn new(event_handler: WindowEventHandler, mtm: MainThreadMarker) -> Retained<Self> {
        let this = Self::alloc(mtm).set_ivars(WorkspaceDelegateIvars {
            event_handler,
            accessibility_monitor: RefCell::new(None),
            pid: RefCell::new(None),
            retry_count: RefCell::new(0),
        });
        unsafe { msg_send![super(this), init] }
    }

    /// Poll for window info until available, then create accessibility monitor.
    ///
    /// Uses exponential backoff capped at 1.6s (200ms → 400ms → 800ms → 1.6s).
    /// Stops automatically if app switches or after ~5 minutes.
    fn poll_window_info(delegate: &Self, pid: i32, app_info: AppInfo) {
        let retry_count = *delegate.ivars().retry_count.borrow();
        *delegate.ivars().retry_count.borrow_mut() = retry_count + 1;

        // Stop polling if timeout after ~5 minutes
        if retry_count >= 188 {
            eprintln!(
                "[PollWindowInfo] Timeout after {} poll attempts (~5 minutes) - PID {} ({:?})",
                retry_count, pid, app_info.name
            );
            Self::stop_polling(delegate);
            return;
        }

        // Get current focused window and check if it belongs to our PID
        let current_window = window_info::get_current_window();
        match current_window {
            Some(window) => {
                // If focused app changed - stop polling for this PID
                if window.app.pid != pid {
                    eprintln!(
                        "[PollWindowInfo] Focused app changed (waiting for PID {}, got PID {}) - stopping polling",
                        pid, window.app.pid
                    );
                    Self::stop_polling(delegate);
                    return;
                }

                // If found focused window for our PID - send event, create monitor, stop polling
                if window.window_id.is_some() {
                    delegate
                        .ivars()
                        .event_handler
                        .handle(WindowEvent::WindowChanged { window });

                    match accessibility::AccessibilityMonitor::new(
                        delegate.ivars().event_handler.clone(),
                        pid,
                    ) {
                        Ok(monitor) => {
                            *delegate.ivars().accessibility_monitor.borrow_mut() = Some(monitor);
                        }
                        Err(e) => {
                            eprintln!(
                                "[PollWindowInfo] Failed to create accessibility monitor (PID {}): {}",
                                pid, e
                            );
                        }
                    }

                    Self::stop_polling(delegate);
                    return;
                } else {
                    // If window exists but window_id is None - continue polling (window not ready yet)
                }
            }
            None => {
                // No focused window - continue polling
            }
        }

        // Continue polling with exponential backoff capped at 1.6s
        let delay = f64::min(0.2 * (2.0_f64).powf(retry_count as f64), 1.6);
        unsafe {
            msg_send![delegate, performSelector: objc2::sel!(pollWindowInfo), withObject: None::<&NSObject>, afterDelay: delay]
        }
    }

    /// Stop polling for window info.
    fn stop_polling(delegate: &Self) {
        *delegate.ivars().pid.borrow_mut() = None;
        *delegate.ivars().retry_count.borrow_mut() = 0;
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
    /// - A dedicated thread that runs AppKit code (e.g. a spawned thread that will run `NSApplication`)
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
    pub fn new(event_handler: WindowEventHandler) -> Result<Self, Error> {
        // SAFETY: Safe when called from main thread or dedicated AppKit thread (as documented)
        let mtm = unsafe { MainThreadMarker::new_unchecked() };

        let delegate = WorkspaceDelegate::new(event_handler, mtm);
        let app = NSApplication::sharedApplication(mtm);

        return Ok(Self {
            delegate,
            app,
            is_running: false,
        });
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
