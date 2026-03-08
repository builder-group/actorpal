pub mod window_info;

mod x11_helpers;
mod x11_monitor;
use crate::config::MonitorConfig;
use crate::error::Error;
use crate::listener::WindowListener;
use std::sync::{Arc, RwLock};
use x11_monitor::X11Monitor;

/// Run the monitor on Linux.
///
/// Coordinates window monitoring using X11 property notifications.
///
/// ## Architecture
///
/// The monitor uses a single event loop that:
/// - Monitors `_NET_ACTIVE_WINDOW` property changes for window focus switches
/// - Monitors `_NET_WM_NAME` and `WM_NAME` property changes for title changes (tab switches)
/// - Uses `select()` with a self-pipe for interruptible event waiting
///
/// This blocks until `stop()` is called from another thread.
pub(super) fn run(
    listener: Arc<RwLock<dyn WindowListener>>,
    config: MonitorConfig,
) -> Result<(), Error> {
    let monitor = X11Monitor::new(listener, config);
    return monitor.run();
}

/// Stop the monitor (thread-safe).
///
/// This can be called from any thread. It signals the event loop to stop.
pub(super) fn stop() -> Result<(), Error> {
    return X11Monitor::stop();
}
