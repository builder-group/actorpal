pub mod accessibility;
mod browser;
mod window_event_handler;
pub mod window_info;
mod workspace;

use crate::{config::MonitorConfig, error::Error, listener::WindowListener, types::WindowEvent};
use std::sync::{Arc, RwLock};
use window_event_handler::WindowEventHandler;
use workspace::WorkspaceMonitor;

/// Run the monitor on macOS.
///
/// Coordinates window monitoring using:
/// - NSWorkspace for app switching detection
/// - Accessibility API for window focus and title changes
/// - CoreGraphics for stable window IDs
///
/// ## Architecture
///
/// The monitoring works through a two-layer system:
/// - **WorkspaceMonitor**: Watches for app switches using NSWorkspace notifications
/// - **AccessibilityMonitor**: Watches for window changes using Accessibility API
///
/// When an app switch occurs, WorkspaceMonitor:
/// - Notifies the handler of the app change
/// - Creates a new AccessibilityMonitor for the new app
/// - Notifies the handler of the initial window state
///
/// This blocks the current thread until `stop()` is called.
///
/// # Threading
///
/// This function must be called from a thread that can safely run AppKit code
/// (either the main thread or a dedicated AppKit thread). See `WorkspaceMonitor::new()`
/// for detailed threading requirements.
///
/// For non-blocking usage (e.g. in Tauri setup), spawn a thread:
/// ```rust,no_run
/// std::thread::spawn(move || {
///     run(listener, config).expect("Monitor failed");
/// });
/// ```
pub(super) fn run(
    listener: Arc<RwLock<dyn WindowListener>>,
    config: MonitorConfig,
) -> Result<(), Error> {
    if config.track_window_changes && !accessibility::is_trusted() {
        return Err(Error::MissingPermissions);
    }

    let event_handler = WindowEventHandler::new(listener, config);
    let mut monitor = WorkspaceMonitor::new(event_handler)?;

    // Send initial window state before event loop starts
    if let Some(window) = window_info::get_current_window() {
        monitor.event_handler().handle(WindowEvent::AppActivated {
            app: window.app.clone(),
        });
        monitor
            .event_handler()
            .handle(WindowEvent::WindowChanged { window });
    }

    monitor.run()?;

    return Ok(());
}

/// Stop the monitor (thread-safe).
pub(super) fn stop() -> Result<(), Error> {
    WorkspaceMonitor::stop();
    return Ok(());
}
