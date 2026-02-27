use serde::{Deserialize, Serialize};
use std::fmt;

/// Information about an application.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    /// Window title
    pub title: Option<String>,
    /// Platform-specific window identifier
    pub window_id: Option<u32>,
    /// Window position and size
    pub bounds: Option<WindowBounds>,
    /// Application information
    pub app: AppInfo,
    /// Browser information (only populated if `allow_browser` is enabled in config)
    pub browser: Option<BrowserInfo>,
}

/// Window bounds (position and size).
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
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
    /// Get the app information from this event.
    pub fn app(&self) -> &AppInfo {
        match self {
            WindowEvent::AppActivated { app } => app,
            WindowEvent::WindowChanged { window } => &window.app,
        }
    }
}

impl fmt::Display for AppInfo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "   App:")?;
        writeln!(f, "      Name:       {}", fmt_display(&self.name))?;
        writeln!(f, "      PID:        {}", self.pid)?;
        writeln!(f, "      Bundle ID:  {}", fmt_display(&self.bundle_id))?;
        writeln!(f, "      Path:       {}", fmt_display(&self.process_path))?;
        Ok(())
    }
}

impl fmt::Display for WindowInfo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "   Window:")?;
        writeln!(f, "      Title:      {}", fmt_display(&self.title))?;
        writeln!(f, "      Window ID:  {}", fmt_display(&self.window_id))?;

        let bounds_str = match self.bounds.as_ref() {
            Some(bounds) => format!(
                "({:.0}, {:.0}) {:.0}×{:.0}",
                bounds.x, bounds.y, bounds.width, bounds.height
            ),
            None => "(not available)".to_string(),
        };
        writeln!(f, "      Bounds:     {}", bounds_str)?;

        writeln!(f, "   App:")?;
        writeln!(f, "      Name:       {}", fmt_display(&self.app.name))?;
        writeln!(f, "      PID:        {}", self.app.pid)?;
        writeln!(f, "      Bundle ID:  {}", fmt_display(&self.app.bundle_id))?;
        writeln!(
            f,
            "      Path:       {}",
            fmt_display(&self.app.process_path)
        )?;

        if let Some(browser) = &self.browser {
            writeln!(f, "   Browser:")?;
            writeln!(f, "      URL:        {}", fmt_display(&browser.url))?;
            let mode_str = match browser.is_private {
                Some(true) => "Private/Incognito",
                Some(false) => "Normal",
                None => "(not available)",
            };
            writeln!(f, "      Mode:       {}", mode_str)?;
        }

        Ok(())
    }
}

/// Format an optional value for display, truncating strings to 70 characters
fn fmt_display<T: fmt::Display>(opt: &Option<T>) -> String {
    match opt {
        Some(value) => {
            let s = value.to_string();
            // Truncate strings to prevent wrapping (respecting UTF-8 character boundaries)
            if s.chars().count() > 70 {
                let truncated: String = s.chars().take(67).collect();
                format!("{}...", truncated)
            } else {
                s
            }
        }
        None => "(not available)".to_string(),
    }
}
