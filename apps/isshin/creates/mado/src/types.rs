/// Information about an application.
#[derive(Debug, Clone)]
pub struct AppInfo {
    /// Process ID
    pub pid: i32,
    /// Application name (localized)
    pub name: Option<String>,
    /// Bundle identifier (macOS) or application class (Linux)
    pub bundle_id: Option<String>,
    /// Path to the executable
    pub process_path: Option<String>,
}

/// Browser-specific information (macOS only).
///
/// Requires Automation permission: System Settings > Privacy & Security > Automation
#[derive(Debug, Clone, Default)]
pub struct BrowserInfo {
    /// Current URL of the active tab.
    pub url: Option<String>,
    /// Whether the window is in private/incognito mode.
    ///
    /// - `None` if detection failed or not supported
    /// - `Some(true)` if private mode is active
    /// - `Some(false)` if private mode is not active
    pub is_private: Option<bool>,
}

/// Information about a window.
#[derive(Debug, Clone)]
pub struct WindowInfo {
    /// Window title
    pub title: String,
    /// Platform-specific window identifier
    pub window_id: u32,
    /// Window position and size
    pub bounds: WindowBounds,
    /// Application information
    pub app: AppInfo,
    /// Browser information (only populated if `allow_browser` is enabled in config)
    pub browser: Option<BrowserInfo>,
}

/// Window bounds (position and size).
#[derive(Debug, Clone, Copy, Default)]
pub struct WindowBounds {
    /// X coordinate (left edge)
    pub x: f64,
    /// Y coordinate (top edge)
    pub y: f64,
    /// Window width
    pub width: f64,
    /// Window height
    pub height: f64,
}

/// Event type for window and app focus changes.
///
/// Distinguishes between app activation (always fires on app switch) and window changes
/// (fires when window focus/title changes or when window becomes available).
#[derive(Debug, Clone)]
pub enum WindowEvent {
    /// Application was activated/switched to.
    ///
    /// This event **always** fires when the user switches to a different app.
    /// It provides immediate notification of the app change, even if the app has no window yet.
    ///
    /// Common scenarios:
    /// - App activated via Spotlight/Dock but hasn't opened a window yet
    /// - Tray apps that don't have windows
    /// - App switching where window information isn't immediately available
    ///
    /// A `WindowChanged` event will follow when a window becomes available (if the app has windows).
    AppActivated {
        /// Application information
        app: AppInfo,
    },
    /// Window focus or title changed.
    ///
    /// This event fires when:
    /// - Window focus changes within the same app
    /// - Window title changes (e.g. tab switches in browsers)
    /// - Complete window information becomes available after app activation
    ///
    /// Note: App switches are always signaled via `AppActivated` events first.
    WindowChanged {
        /// Complete window information including app details
        window: WindowInfo,
    },
}

impl WindowEvent {
    /// Check if the window data in this event is complete and valid.
    ///
    /// Returns `true` if this is a `WindowChanged` event with valid window data
    /// (non-zero window_id and non-zero size).
    pub fn has_complete_window_data(&self) -> bool {
        match self {
            WindowEvent::AppActivated { .. } => false,
            WindowEvent::WindowChanged { window } => {
                window.window_id != 0 && window.bounds.width > 0.0 && window.bounds.height > 0.0
            }
        }
    }

    /// Get the app information from this event.
    pub fn app(&self) -> &AppInfo {
        match self {
            WindowEvent::AppActivated { app } => app,
            WindowEvent::WindowChanged { window } => &window.app,
        }
    }
}
