use super::browser;
use crate::{config::MonitorConfig, listener::WindowListener, types::WindowInfo};
use std::sync::{Arc, RwLock};

/// Handler for window change events.
///
/// Bundles the listener and configuration, applies browser middleware,
/// and delegates to the listener.
#[derive(Clone)]
pub struct WindowHandler {
    listener: Arc<RwLock<dyn WindowListener>>,
    config: MonitorConfig,
}

impl WindowHandler {
    pub fn new(listener: Arc<RwLock<dyn WindowListener>>, config: MonitorConfig) -> Self {
        return Self { listener, config };
    }

    /// Handle window change event.
    pub fn handle(&self, mut window: WindowInfo) {
        // Extend window info with browser data if enabled
        if self.config.allow_browser {
            browser::extend_window_info(&mut window);
        }

        // Call the listener
        if let Ok(guard) = self.listener.read() {
            guard.on_focus_change(window);
        }
    }

    pub fn config(&self) -> MonitorConfig {
        return self.config;
    }
}
