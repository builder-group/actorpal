use super::browser;
use crate::{config::MonitorConfig, listener::WindowListener, types::WindowEvent};
use std::sync::{Arc, RwLock};

/// Handler for window events.
///
/// Bundles the listener and configuration, applies browser middleware,
/// and delegates to the listener.
#[derive(Clone)]
pub struct WindowEventHandler {
    listener: Arc<RwLock<dyn WindowListener>>,
    config: MonitorConfig,
}

impl WindowEventHandler {
    pub fn new(listener: Arc<RwLock<dyn WindowListener>>, config: MonitorConfig) -> Self {
        return Self { listener, config };
    }

    /// Handle window event.
    pub fn handle(&self, mut event: WindowEvent) {
        // Extend window info with browser data if enabled
        if self.config.allow_browser {
            if let WindowEvent::WindowChanged { window } = &mut event {
                browser::extend_window_info(window);
            }
        }

        // Call the listener
        if let Ok(guard) = self.listener.read() {
            guard.on_focus_change(event);
        }
    }

    pub fn config(&self) -> MonitorConfig {
        return self.config;
    }
}
