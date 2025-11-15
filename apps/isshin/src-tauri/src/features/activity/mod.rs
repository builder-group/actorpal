pub mod commands;
pub mod library;
pub mod types;

use crate::features::activity::library::monitor;
use tauri::AppHandle;

pub fn setup(app: AppHandle) {
    // Start background activity monitoring
    tauri::async_runtime::spawn(async move {
        monitor::start_monitoring(app).await;
    });
}
