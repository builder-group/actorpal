//! Configuration for window monitoring

/// Configuration for the window monitor
#[derive(Debug, Clone, Copy, Default)]
pub struct MonitorConfig {
    /// Whether to include detailed window information in callbacks
    ///
    /// When `true`, callbacks receive full window info including bounds, window ID, etc.
    /// When `false`, only basic info (title, app name) is provided.
    ///
    /// Default: `false` (minimal overhead)
    pub detailed_info: bool,
}
