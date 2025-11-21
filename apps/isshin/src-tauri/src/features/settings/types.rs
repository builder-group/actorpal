use serde::{Deserialize, Serialize};

/// Global application settings.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// Activity window tracking settings
    pub activity_window: ActivityWindowSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            activity_window: ActivityWindowSettings::default(),
        }
    }
}

/// Settings for the activity window feature.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ActivityWindowSettings {
    /// Whether to track window changes (tab switches, window switches within apps)
    pub track_window: bool,
    /// Whether to track browser URLs (requires Automation permission on macOS)
    pub track_browser: bool,
}

impl Default for ActivityWindowSettings {
    fn default() -> Self {
        Self {
            track_window: true,
            track_browser: true,
        }
    }
}
