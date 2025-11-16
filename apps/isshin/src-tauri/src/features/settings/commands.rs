use crate::app::window::Window;
use crate::environment::configs::db::DbConfig;
use crate::environment::states::settings::SettingsState;
use crate::features::settings::types::{ActivityWindowSettings, AppSettings};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
#[specta::specta]
pub async fn show_settings_window(app: AppHandle) -> Result<(), String> {
    Window::Settings
        .show(&app)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_database_path(app: AppHandle) -> Result<String, String> {
    let data_dir_path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    std::fs::create_dir_all(&data_dir_path).map_err(|e| {
        format!(
            "Failed to create app data directory at {}: {}",
            data_dir_path.display(),
            e
        )
    })?;

    let db_path = data_dir_path.join(DbConfig::db_name());
    Ok(db_path.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_settings(state: State<'_, SettingsState>) -> Result<AppSettings, String> {
    Ok(state.lock().unwrap().clone())
}

#[tauri::command]
#[specta::specta]
pub async fn set_settings(
    settings: AppSettings,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    *state.lock().unwrap() = settings;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_activity_window_settings(
    state: State<'_, SettingsState>,
) -> Result<ActivityWindowSettings, String> {
    Ok(state.lock().unwrap().activity_window.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn set_activity_window_settings(
    settings: ActivityWindowSettings,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    state.lock().unwrap().activity_window = settings;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn update_track_window(
    value: bool,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    state.lock().unwrap().activity_window.track_window = value;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn update_track_browser(
    value: bool,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    state.lock().unwrap().activity_window.track_browser = value;
    Ok(())
}
