use crate::{
    config::MonitorConfig,
    error::Error,
    listener::WindowListener,
    types::{AppInfo, WindowInfo},
};
use std::sync::{Arc, RwLock};

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "linux")]
pub mod linux;

/// Start monitoring window and application focus changes.
///
/// This blocks the current thread until `stop()` is called.
pub fn run(listener: Arc<RwLock<dyn WindowListener>>, config: MonitorConfig) -> Result<(), Error> {
    #[cfg(target_os = "macos")]
    {
        macos::run(listener, config)
    }

    #[cfg(target_os = "linux")]
    {
        linux::run(listener, config)
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

/// Stop the monitor (thread-safe).
///
/// This can be called from any thread to signal the monitor to stop.
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

/// Get information about the currently active application.
///
/// This is a synchronous query that returns the current state immediately.
pub fn get_active_app() -> Result<AppInfo, Error> {
    #[cfg(target_os = "macos")]
    {
        macos::app_info::get_current_app().ok_or(Error::NoActiveApp)
    }

    #[cfg(target_os = "linux")]
    {
        linux::window_info::get_current_app().ok_or(Error::NoActiveApp)
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

/// Get information about the currently active window.
///
/// This is a synchronous query that returns the current state immediately.
/// The returned `WindowInfo` includes both window details and the associated app info.
pub fn get_active_window() -> Result<WindowInfo, Error> {
    #[cfg(target_os = "macos")]
    {
        macos::window_info::get_current_window().ok_or(Error::NoActiveWindow)
    }

    #[cfg(target_os = "linux")]
    {
        linux::window_info::get_current_window().ok_or(Error::NoActiveWindow)
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

/// Check if accessibility permissions are granted (macOS only).
///
/// On macOS, accessibility permissions are required for window monitoring.
/// This function returns `true` if permissions are granted.
///
/// On Linux and other platforms, this always returns `true`.
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
