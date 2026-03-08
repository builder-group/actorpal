use crate::features::settings::types::AppSettings;
use std::sync::Mutex;

/// Type alias for settings state.
/// `Mutex` is used to ensure thread-safe access to the settings.
pub type SettingsState = Mutex<AppSettings>;
