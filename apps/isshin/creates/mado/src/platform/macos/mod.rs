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
mod cg_helpers;
mod global_state;
pub mod window_info;
mod workspace;

use std::sync::{Arc, RwLock};

use crate::config::MonitorConfig;
use crate::error::Error;
use crate::handler::EventHandler;

use accessibility::AccessibilityMonitor;
use workspace::WorkspaceMonitor;

/// Run the monitor on macOS
///
/// This initializes both workspace and accessibility monitors, then blocks
/// until stop() is called from another thread.
pub fn run(handler: Arc<RwLock<dyn EventHandler>>, config: MonitorConfig) -> Result<(), Error> {
    if !accessibility::is_trusted() {
        return Err(Error::MissingPermissions);
    }

    global_state::set_handler(handler.clone());

    let workspace = WorkspaceMonitor::new(config);
    let accessibility = AccessibilityMonitor::new(handler.clone(), config);

    // Notify initial state before starting event loop
    if let Some(window) = window_info::get_current_window() {
        if let Ok(guard) = handler.read() {
            guard.on_focus_change(window);
        }
    }

    workspace.start()?;
    accessibility.start()?;
    workspace.run()?;

    AccessibilityMonitor::stop()?;
    WorkspaceMonitor::stop()?;

    Ok(())
}

/// Stop the monitor
///
/// This can be called from any thread. It will signal the run loop to stop.
pub fn stop() -> Result<(), Error> {
    AccessibilityMonitor::stop()?;
    WorkspaceMonitor::stop()?;
    Ok(())
}
