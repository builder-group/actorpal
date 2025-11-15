pub mod commands;
mod monitor;
mod repository;
pub mod types;

use tauri::AppHandle;

pub fn setup(app: AppHandle) {
    monitor::start_monitoring(app)
}
