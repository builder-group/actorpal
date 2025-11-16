/// Information about an application.
#[derive(Debug, Clone)]
pub struct AppInfo {
    /// Process ID
    pub pid: i32,
    /// Application name (localized)
    pub name: String,
    /// Bundle identifier (macOS) or application class (Linux)
    pub bundle_id: String,
    /// Path to the executable
    pub process_path: String,
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
