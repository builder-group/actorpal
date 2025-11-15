use crate::environment::states::app::AppState;
use crate::library::window::Window;
use tauri::AppHandle;

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
pub fn is_exit_blocked(state: tauri::State<'_, AppState>) -> bool {
    state.is_exit_blocked()
}

#[tauri::command]
#[specta::specta]
pub fn set_exit_blocked(state: tauri::State<'_, AppState>, block: bool) {
    state.set_block_exit(block);
}
