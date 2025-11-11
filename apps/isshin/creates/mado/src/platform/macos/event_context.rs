//! Event context that bundles handler and config
//!
//! This eliminates prop drilling by bundling config with the handler.
//! The middleware logic is handled here, keeping everything KISS.

use std::sync::{Arc, RwLock};

use crate::config::MonitorConfig;
use crate::handler::EventHandler;
use crate::types::WindowInfo;

use super::browser;

/// Event context that stores handler and config together
///
/// Handles middleware (browser extension, etc.) and calls the handler.
/// This eliminates the need to pass config separately through callbacks.
#[derive(Clone)]
pub struct EventContext {
    handler: Arc<RwLock<dyn EventHandler>>,
    config: MonitorConfig,
}

impl EventContext {
    pub fn new(handler: Arc<RwLock<dyn EventHandler>>, config: MonitorConfig) -> Self {
        Self { handler, config }
    }

    /// Handle a window change event
    ///
    /// This applies middleware (browser extension, etc.) and then calls the handler.
    pub fn handle(&self, mut window: WindowInfo) {
        // Apply middleware (browser extension, etc.)
        browser::extend_window_info(&mut window, self.config);

        // Call the actual handler
        if let Ok(guard) = self.handler.read() {
            guard.on_focus_change(window);
        }
    }

    /// Get a clone of the handler (for creating new monitors)
    pub fn handler(&self) -> Arc<RwLock<dyn EventHandler>> {
        self.handler.clone()
    }

    /// Get the config (for cloning into new contexts)
    pub fn config(&self) -> MonitorConfig {
        self.config
    }
}
