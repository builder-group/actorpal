//! Platform-specific implementations

use std::sync::{Arc, RwLock};

use crate::config::MonitorConfig;
use crate::error::Error;
use crate::handler::EventHandler;
use crate::types::{AppInfo, WindowInfo};

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "linux")]
pub mod linux;

pub fn run(handler: Arc<RwLock<dyn EventHandler>>, config: MonitorConfig) -> Result<(), Error> {
    #[cfg(target_os = "macos")]
    {
        macos::run(handler, config)
    }

    #[cfg(target_os = "linux")]
    {
        linux::run(handler, config)
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

pub fn stop() -> Result<(), Error> {
    #[cfg(target_os = "macos")]
    {
        macos::stop()
    }

    #[cfg(target_os = "linux")]
    {
        linux::stop()
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

pub fn get_active_app() -> Result<AppInfo, Error> {
    #[cfg(target_os = "macos")]
    {
        macos::window_info::get_current_app()
            .ok_or_else(|| Error::Platform("No active application found".to_string()))
    }

    #[cfg(target_os = "linux")]
    {
        linux::window_info::get_current_app()
            .ok_or_else(|| Error::Platform("No active application found".to_string()))
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

pub fn get_active_window() -> Result<WindowInfo, Error> {
    #[cfg(target_os = "macos")]
    {
        macos::window_info::get_current_window()
            .ok_or_else(|| Error::Platform("No active window found".to_string()))
    }

    #[cfg(target_os = "linux")]
    {
        linux::window_info::get_current_window()
            .ok_or_else(|| Error::Platform("No active window found".to_string()))
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

pub fn is_accessibility_trusted() -> bool {
    #[cfg(target_os = "macos")]
    {
        macos::accessibility::is_trusted()
    }

    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}
