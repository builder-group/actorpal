use crate::features::activity::library::repository::ActivityRepository;
use crate::features::activity::types::ActivityEntry;
use tauri::State;

use crate::environment::states::db::DatabaseState;

#[tauri::command]
#[specta::specta]
pub async fn get_activity_entries(
    state: State<'_, DatabaseState>,
) -> Result<Vec<ActivityEntry>, String> {
    println!("[Activity] Getting all activity entries");
    ActivityRepository::get_all(&state.0.pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_activity_entries_since(
    state: State<'_, DatabaseState>,
    since_timestamp: u64,
) -> Result<Vec<ActivityEntry>, String> {
    println!(
        "[Activity] Getting activity entries since timestamp: {}",
        since_timestamp
    );
    ActivityRepository::get_since(&state.0.pool, since_timestamp)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn insert_activity_entry(
    state: State<'_, DatabaseState>,
    entry: ActivityEntry,
) -> Result<(), String> {
    println!("[Activity] Inserting activity entry: {:?}", entry);
    ActivityRepository::insert(&state.0.pool, &entry)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_all_activity_entries(state: State<'_, DatabaseState>) -> Result<(), String> {
    println!("[Activity] Deleting all activity entries");
    ActivityRepository::delete_all(&state.0.pool)
        .await
        .map_err(|e| e.to_string())
}
