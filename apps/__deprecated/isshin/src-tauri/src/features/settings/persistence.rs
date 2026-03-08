use crate::common::path::get_app_data_dir;
use crate::environment::configs::settings::SettingsConfig;
use crate::features::settings::types::AppSettings;
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, Runtime};

fn get_settings_path<R: Runtime, M: Manager<R>>(app: &M) -> PathBuf {
    let data_dir = get_app_data_dir(app);
    data_dir.join(SettingsConfig::settings_file_name())
}

/// Load settings from disk, or return defaults if file doesn't exist.
pub fn load_settings<R: Runtime, M: Manager<R>>(app: &M) -> AppSettings {
    let settings_path = get_settings_path(app);

    if !settings_path.exists() {
        return AppSettings::default();
    }

    match fs::read_to_string(&settings_path) {
        Ok(content) => match serde_json::from_str::<AppSettings>(&content) {
            Ok(settings) => settings,
            Err(e) => {
                eprintln!("[Settings] Failed to parse settings file: {}", e);
                AppSettings::default()
            }
        },
        Err(e) => {
            eprintln!("[Settings] Failed to read settings file: {}", e);
            AppSettings::default()
        }
    }
}

/// Save settings to disk.
pub fn save_settings<R: Runtime, M: Manager<R>>(
    app: &M,
    settings: &AppSettings,
) -> Result<(), String> {
    let settings_path = get_settings_path(app);

    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, json).map_err(|e| format!("Failed to write settings file: {}", e))?;

    return Ok(());
}
