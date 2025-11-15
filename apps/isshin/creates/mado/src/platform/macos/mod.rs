//! macOS implementation
//!
//! This module coordinates window monitoring on macOS using:
//! - NSWorkspace for app switching detection
//! - Accessibility API for window focus and title changes
//! - CoreGraphics for stable window IDs
//!
//! ## Architecture
//!
//! The monitoring works through a two-layer system:
//! 1. **WorkspaceMonitor**: Watches for app switches using NSWorkspace notifications
//! 2. **AccessibilityMonitor**: Watches for window changes using Accessibility API
//!
//! When an app switch occurs, WorkspaceMonitor:
//! - Notifies the handler of the app change
//! - Creates a new AccessibilityMonitor for the new app
//! - Notifies the handler of the initial window state

pub mod accessibility;
mod browser;
mod event_context;
pub mod window_info;
mod workspace;

use std::sync::{Arc, RwLock};

use crate::config::MonitorConfig;
use crate::error::Error;
use crate::handler::EventHandler;

use event_context::EventContext;
use workspace::WorkspaceMonitor;

/// Run the monitor on macOS
///
/// This blocks the current thread until stop() is called.
///
/// # Threading
///
/// This function must be called from a thread that can safely run AppKit code
/// (either the main thread or a dedicated AppKit thread). See `WorkspaceMonitor::new()`
/// for detailed threading requirements.
///
/// For non-blocking usage (e.g., in Tauri setup), spawn a thread:
/// ```rust,no_run
/// std::thread::spawn(move || {
///     run(handler, config).expect("Monitor failed");
/// });
/// ```
pub(super) fn run(
    handler: Arc<RwLock<dyn EventHandler>>,
    config: MonitorConfig,
) -> Result<(), Error> {
    // Only require accessibility permissions if tracking window changes
    // (NSWorkspace for app switches doesn't need accessibility)
    if config.track_window_changes && !accessibility::is_trusted() {
        return Err(Error::MissingPermissions);
    }

    let context = EventContext::new(handler, config);
    let mut monitor = WorkspaceMonitor::new(context)?;

    // Notify initial state before starting event loop
    if let Some(window) = window_info::get_current_window() {
        monitor.context().handle(window);
    }

    // Start monitoring and run the event loop (blocks)
    monitor.run()?;

    return Ok(());
}

/// Stop the monitor
///
/// This can be called from any thread. It will signal the run loop to stop.
pub(super) fn stop() -> Result<(), Error> {
    WorkspaceMonitor::stop();
    return Ok(());
}
