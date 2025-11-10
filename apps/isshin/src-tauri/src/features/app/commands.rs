use active_win_pos_rs::get_active_window;

#[tauri::command]
pub fn get_focused_application() -> Option<String> {
    get_active_window().ok().map(|window| window.app_name)
}
