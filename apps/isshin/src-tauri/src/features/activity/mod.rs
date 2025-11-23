use crate::features::activity_window;
use tauri::AppHandle;

pub fn setup(app: AppHandle) {
    // Register activity monitors
    activity_window::setup(app.clone());
}
