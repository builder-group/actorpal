use super::{repository::ActivityRepository, types::ActivityEntry};
use crate::environment::states::db::DatabaseState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_activity_entries(
    state: State<'_, DatabaseState>,
) -> Result<Vec<ActivityEntry>, String> {
    return ActivityRepository::get_all(&state.pool)
        .await
        .map_err(|e| e.to_string());
}

#[tauri::command]
#[specta::specta]
pub async fn clear_activity_entries(state: State<'_, DatabaseState>) -> Result<(), String> {
    return ActivityRepository::delete_all(&state.pool)
        .await
        .map_err(|e| e.to_string());
}
