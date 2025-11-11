//! # mado (窓)
//!
//! A simple, clean window monitoring library.
//!
//! **mado** (窓) means "window" in Japanese - simple and direct.
//!
//! ## Features
//!
//! - 🪟 **Query current state** - Get active app/window on demand
//! - 📡 **Monitor changes** - Listen to app switches and window changes
//! - 📑 **Tab switch detection** - Detects browser tab switches
//! - 🎯 **Simple API** - Query functions + event listeners
//! - 🧩 **Clean architecture** - KISS principle throughout
//! - 🚀 **Minimal overhead** - Efficient event-driven monitoring
//!
//! ## Usage
//!
//! ### Query current state
//!
//! Get the current active app or window on demand:
//!
//! ```rust,no_run
//! use mado;
//!
//! // Get current active app
//! let app = mado::get_active_app()?;
//! println!("Current app: {}", app.name);
//!
//! // Get current active window (includes app info)
//! let window = mado::get_active_window()?;
//! println!("Window: {} in {}", window.title, window.app.name);
//! # Ok::<(), mado::Error>(())
//! ```
//!
//! ### Listen to changes
//!
//! Monitor app switches and window changes in real-time:
//!
//! ```rust,no_run
//! use mado::{EventHandler, Monitor, WindowInfo};
//!
//! struct MyHandler;
//!
//! impl EventHandler for MyHandler {
//!     fn on_app_change(&self, window: WindowInfo) {
//!         println!("Switched to: {}", window.app.name);
//!         println!("  Initial window: {}", window.title);
//!     }
//!
//!     fn on_window_change(&self, window: WindowInfo) {
//!         println!("Window: {}", window.title);
//!     }
//! }
//!
//! fn main() -> Result<(), mado::Error> {
//!     let monitor = Monitor::new(MyHandler);
//!     monitor.run() // Blocks until stopped
//! }
//! ```
//!
//! ### Use both together
//!
//! Combine querying and listening:
//!
//! ```rust,no_run
//! use mado::{EventHandler, Monitor, WindowInfo};
//!
//! struct MyHandler;
//!
//! impl EventHandler for MyHandler {
//!     fn on_app_change(&self, window: WindowInfo) {
//!         // You already have full context in window.app
//!         println!("App: {} ({})", window.app.name, window.app.bundle_id);
//!         
//!         // But you can query for additional info if needed
//!         if let Ok(current) = mado::get_active_window() {
//!             println!("Confirmed: {}", current.title);
//!         }
//!     }
//!
//!     fn on_window_change(&self, _window: WindowInfo) {
//!         // Handle window changes
//!     }
//! }
//! # Ok::<(), mado::Error>(())
//! ```
//!
//! ## Platform Support
//!
//! - ✅ **macOS**: Full support (NSWorkspace + Accessibility API)
//! - ✅ **Linux**: Full support (X11)
//! - 🚧 **Windows**: Planned

pub mod config;
pub mod error;
pub mod handler;
pub mod monitor;
pub mod types;

#[cfg(any(target_os = "macos", target_os = "linux"))]
pub mod platform;

pub use config::MonitorConfig;
pub use error::Error;
pub use handler::EventHandler;
pub use monitor::Monitor;
pub use types::{AppInfo, WindowBounds, WindowInfo};

// ============================================================================
// Query API - Get current state on demand
// ============================================================================

/// Get information about the currently active application
///
/// This is a synchronous query that returns the current state immediately.
///
/// # Errors
///
/// Returns an error if:
/// - No application is currently active
/// - Platform API calls fail
///
/// # Example
///
/// ```rust,no_run
/// let app = mado::get_active_app()?;
/// println!("Current app: {} (PID: {})", app.name, app.pid);
/// # Ok::<(), mado::Error>(())
/// ```
pub fn get_active_app() -> Result<AppInfo, Error> {
    #[cfg(target_os = "macos")]
    {
        platform::macos::window_info::get_current_app()
            .ok_or_else(|| Error::Platform("No active application found".to_string()))
    }

    #[cfg(target_os = "linux")]
    {
        platform::linux::get_current_app()
            .ok_or_else(|| Error::Platform("No active application found".to_string()))
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

/// Get information about the currently active window
///
/// This is a synchronous query that returns the current state immediately.
/// The returned `WindowInfo` includes both window details and the associated app info.
///
/// # Errors
///
/// Returns an error if:
/// - No window is currently focused
/// - Accessibility permissions are missing
/// - Platform API calls fail
///
/// # Example
///
/// ```rust,no_run
/// let window = mado::get_active_window()?;
/// println!("Current window: '{}'", window.title);
/// println!("  App: {}", window.app.name);
/// println!("  Size: {}x{}", window.bounds.width, window.bounds.height);
/// # Ok::<(), mado::Error>(())
/// ```
pub fn get_active_window() -> Result<WindowInfo, Error> {
    #[cfg(target_os = "macos")]
    {
        platform::macos::window_info::get_current_window()
            .ok_or_else(|| Error::Platform("No active window found".to_string()))
    }

    #[cfg(target_os = "linux")]
    {
        platform::linux::get_current_window()
            .ok_or_else(|| Error::Platform("No active window found".to_string()))
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(Error::Platform("Platform not yet implemented".to_string()))
    }
}

/// Check if accessibility permissions are granted (macOS only)
///
/// On macOS, accessibility permissions are required for window monitoring.
/// This function returns `true` if permissions are granted.
///
/// On Linux and other platforms, this always returns `true`.
///
/// # Example
///
/// ```rust,no_run
/// if !mado::is_accessibility_trusted() {
///     eprintln!("Please grant accessibility permissions in System Settings");
/// }
/// ```
#[cfg(target_os = "macos")]
pub fn is_accessibility_trusted() -> bool {
    platform::macos::accessibility::is_trusted()
}

#[cfg(not(target_os = "macos"))]
pub fn is_accessibility_trusted() -> bool {
    true
}
