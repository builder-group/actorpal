use super::repository::{AppActivityRepository, WindowActivityRepository};
use super::types::{AppActivity, AppInfoDto, WindowActivity, WindowInfoDto};
use crate::environment::states::db::DatabaseState;
use mado;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_app_activities(
    state: State<'_, DatabaseState>,
) -> Result<Vec<AppActivity>, String> {
    let start_time = 0i64;
    let end_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    AppActivityRepository::get_by_time_range(&state.pool, start_time, end_time)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_window_activities(
    state: State<'_, DatabaseState>,
) -> Result<Vec<WindowActivity>, String> {
    let start_time = 0i64;
    let end_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    WindowActivityRepository::get_by_time_range(&state.pool, start_time, end_time)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn clear_app_activities(state: State<'_, DatabaseState>) -> Result<(), String> {
    AppActivityRepository::delete_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn clear_window_activities(state: State<'_, DatabaseState>) -> Result<(), String> {
    WindowActivityRepository::delete_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_current_active_app() -> Result<AppInfoDto, String> {
    mado::get_active_app()
        .map(AppInfoDto::from)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_current_active_window() -> Result<WindowInfoDto, String> {
    mado::get_active_window()
        .map(WindowInfoDto::from)
        .map_err(|e| e.to_string())
}
