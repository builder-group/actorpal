//! Linux implementation using X11
//!
//! This module coordinates window monitoring on Linux using X11 property notifications.
//! X11 is window-centric - windows are the primary abstraction.
//!
//! ## Architecture
//!
//! The monitor uses a single event loop that:
//! 1. Monitors `_NET_ACTIVE_WINDOW` property changes for window focus switches
//! 2. Monitors `_NET_WM_NAME` and `WM_NAME` property changes for title changes (tab switches)
//! 3. Uses `select()` with a self-pipe for interruptible event waiting

pub mod window_info;
mod x11_helpers;
mod x11_monitor;

use std::sync::{Arc, RwLock};

use crate::config::MonitorConfig;
use crate::error::Error;
use crate::handler::EventHandler;

use x11_monitor::X11Monitor;

/// Run the monitor on Linux
///
/// This initializes the X11 monitor and blocks until stop() is called from another thread.
pub(super) fn run(
    handler: Arc<RwLock<dyn EventHandler>>,
    config: MonitorConfig,
) -> Result<(), Error> {
    let monitor = X11Monitor::new(handler, config);
    return monitor.run();
}

/// Stop the monitor
///
/// This can be called from any thread. It will signal the event loop to stop.
pub(super) fn stop() -> Result<(), Error> {
    return X11Monitor::stop();
}
