use serde::{Deserialize, Serialize};

/// Global application settings.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// Activity tracking settings
    pub tracking: TrackingSettings,
    /// Pomodoro timer settings
    pub pomodoro: PomodoroSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            tracking: TrackingSettings::default(),
            pomodoro: PomodoroSettings::default(),
        }
    }
}

/// Settings for activity tracking.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TrackingSettings {
    /// Whether to track window changes (tab switches, window switches within apps)
    pub track_window: bool,
    /// Whether to track browser URLs (requires Automation permission on macOS)
    pub track_browser: bool,
}

impl Default for TrackingSettings {
    fn default() -> Self {
        Self {
            track_window: true,
            track_browser: true,
        }
    }
}

/// Settings for the Pomodoro timer.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroSettings {
    /// Duration of focus phase in minutes
    pub focus_duration: u32,
    /// Duration of short break phase in minutes
    pub short_break_duration: u32,
    /// Duration of long break phase in minutes
    pub long_break_duration: u32,
    /// Number of rounds before a long break
    pub rounds: u32,
    /// List of websites to block during focus phase
    pub blocked_sites: Vec<String>,
}

impl Default for PomodoroSettings {
    fn default() -> Self {
        Self {
            focus_duration: 25,
            short_break_duration: 5,
            long_break_duration: 15,
            rounds: 4,
            blocked_sites: Vec::new(),
        }
    }
}
