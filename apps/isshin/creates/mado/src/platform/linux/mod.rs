//! Linux implementation using X11
//!
//! Single event loop monitoring X11 property changes. Simpler than macOS:
//! - No separate app/window monitoring (X11 is window-centric)
//! - No global state needed

pub mod window_info;
mod x11_helpers;
mod x11_monitor;

use std::sync::{Arc, RwLock};

use crate::config::MonitorConfig;
use crate::error::Error;
use crate::handler::EventHandler;

use x11_monitor::X11Monitor;

/// Run the monitor on Linux
pub fn run(handler: Arc<RwLock<dyn EventHandler>>, config: MonitorConfig) -> Result<(), Error> {
    let monitor = X11Monitor::new(handler, config);
    monitor.run()
}

/// Stop the monitor
pub fn stop() -> Result<(), Error> {
    X11Monitor::stop()
}
