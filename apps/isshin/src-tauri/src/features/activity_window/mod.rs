pub mod commands;
mod repository;
pub mod types;
mod watcher;

use tauri::AppHandle;

pub fn setup(app: AppHandle) {
    watcher::start_monitoring(app);
}
