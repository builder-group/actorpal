pub mod commands;
mod monitor;
mod repository;
pub mod types;

use tauri::AppHandle;

pub fn setup(app: AppHandle) {
    // Start background activity monitoring
    tauri::async_runtime::spawn(async move {
        monitor::start_monitoring(app).await;
    });
}
