/// Configuration for the window monitor.
#[derive(Debug, Clone, Copy)]
pub struct MonitorConfig {
    /// Whether to extract browser URLs (macOS only).
    ///
    /// When enabled, fetches the current URL from browser windows using AppleScript.
    /// Requires Automation permission: System Settings > Privacy & Security > Automation
    ///
    /// Default: `false` (minimal overhead, no additional permissions)
    pub allow_browser: bool,

    /// Whether to track window changes within the same app.
    ///
    /// When `true` (default), fires events for:
    /// - App switches (always tracked)
    /// - Window switches within the same app
    /// - Tab switches in browsers
    ///
    /// When `false`, only fires events for app switches.
    ///
    /// Default: `true` (track all changes)
    pub track_window_changes: bool,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            allow_browser: false,
            track_window_changes: true,
        }
    }
}
