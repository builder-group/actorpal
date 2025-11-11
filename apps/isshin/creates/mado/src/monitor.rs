//! Main window monitor

use std::sync::{Arc, RwLock};

use crate::config::MonitorConfig;
use crate::error::Error;
use crate::handler::EventHandler;

/// Window monitor that tracks application and window focus changes
///
/// ## Example
///
/// ```rust,no_run
/// use mado::{Monitor, EventHandler, WindowInfo};
///
/// struct MyHandler;
/// impl EventHandler for MyHandler {
///     fn on_focus_change(&self, window: WindowInfo) {
///         println!("Window: {} in app: {}", window.title, window.app.name);
///     }
/// }
///
/// let monitor = Monitor::new(MyHandler);
/// monitor.run()?;
/// ```
pub struct Monitor {
    handler: Arc<RwLock<dyn EventHandler>>,
    config: MonitorConfig,
}

impl Monitor {
    /// Create a new monitor with default configuration
    pub fn new<H: EventHandler + 'static>(handler: H) -> Self {
        Self {
            handler: Arc::new(RwLock::new(handler)),
            config: MonitorConfig::default(),
        }
    }

    /// Create a new monitor with custom configuration
    pub fn with_config<H: EventHandler + 'static>(handler: H, config: MonitorConfig) -> Self {
        Self {
            handler: Arc::new(RwLock::new(handler)),
            config,
        }
    }

    /// Start monitoring (blocks until stopped)
    ///
    /// # Errors
    /// Returns `Error` if platform initialization fails or permissions are missing
    pub fn run(self) -> Result<(), Error> {
        crate::platform::run(self.handler, self.config)
    }

    /// Stop the monitor (can be called from another thread)
    pub fn stop() -> Result<(), Error> {
        crate::platform::stop()
    }
}
