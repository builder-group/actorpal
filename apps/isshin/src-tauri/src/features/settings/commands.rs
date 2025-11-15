use crate::app::window::Window;
use crate::environment::configs::db::DbConfig;
use tauri::{AppHandle, Manager};

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
