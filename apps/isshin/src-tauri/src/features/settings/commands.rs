use crate::{
    app::window::ShowWindow,
    common::path::get_app_data_dir,
    environment::{configs::db::DbConfig, states::settings::SettingsState},
    features::settings::{persistence, types::AppSettings},
};
use std::process::Command;
use tauri::{AppHandle, State};

#[tauri::command]
#[specta::specta]
pub async fn show_settings_window(app: AppHandle) -> Result<(), String> {
    ShowWindow::Settings
        .show(&app)
        .await
        .map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn get_database_path(app: AppHandle) -> Result<String, String> {
    let data_dir_path = get_app_data_dir(&app);
    let db_path = data_dir_path.join(DbConfig::db_name());
    return Ok(db_path.to_string_lossy().to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn get_settings(state: State<'_, SettingsState>) -> Result<AppSettings, String> {
    return Ok(state.lock().unwrap().clone());
}

#[tauri::command]
#[specta::specta]
pub async fn set_settings(
    settings: AppSettings,
    app: AppHandle,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    // Update in-memory state
    *state.lock().unwrap() = settings.clone();

    // Persist to disk
    persistence::save_settings(&app, &settings)?;

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn open_database_directory(app: AppHandle) -> Result<(), String> {
    let data_dir_path = get_app_data_dir(&app);

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&data_dir_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        Command::new("xdg-open")
            .arg(&data_dir_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    return Ok(());
}
