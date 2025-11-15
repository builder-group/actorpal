use super::repository::ActivityRepository;
use super::types::ActivityEntry;
use crate::environment::states::db::DatabaseState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_activity_entries(
    state: State<'_, DatabaseState>,
) -> Result<Vec<ActivityEntry>, String> {
    ActivityRepository::get_all(&state.0.pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn clear_activity_entries(state: State<'_, DatabaseState>) -> Result<(), String> {
    ActivityRepository::delete_all(&state.0.pool)
        .await
        .map_err(|e| e.to_string())
}
