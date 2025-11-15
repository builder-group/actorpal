use std::path::PathBuf;
use tauri::{App, Manager};

pub fn get_app_data_dir(app: &App) -> PathBuf {
    let data_dir_path = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    std::fs::create_dir_all(&data_dir_path).unwrap_or_else(|err| {
        panic!(
            "Failed to create app data directory at {}: {}",
            data_dir_path.display(),
            err
        )
    });

    data_dir_path
}
