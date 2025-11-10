use active_win_pos_rs::get_active_window;

#[tauri::command]
#[specta::specta]
pub fn get_focused_application() -> Option<String> {
    return get_active_window().ok().map(|window| window.app_name);
}
