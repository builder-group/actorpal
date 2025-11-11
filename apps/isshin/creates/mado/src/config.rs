//! Configuration for window monitoring

/// Configuration for the window monitor
#[derive(Debug, Clone, Copy)]
pub struct MonitorConfig {
    /// Whether to extract browser URLs (macOS only)
    ///
    /// When enabled, fetches the current URL from browser windows using AppleScript.
    /// Requires Automation permission: System Settings > Privacy & Security > Automation
    ///
    /// Default: `false` (minimal overhead, no additional permissions)
    pub allow_browser: bool,
}

impl Default for MonitorConfig {
    fn default() -> Self {
        Self {
            allow_browser: false,
        }
    }
}
