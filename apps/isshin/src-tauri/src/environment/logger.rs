use std::fs::OpenOptions;
use std::io::Write;
use tauri::{AppHandle, Manager};

use crate::environment::configs::logger::LoggerConfig;

pub struct Logger;

impl Logger {
    pub fn log(app: &AppHandle, message: &str) {
        if let Ok(data_dir) = app.path().app_data_dir() {
            let log_path = data_dir.join(LoggerConfig::log_file_name());
            if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
                let _ = writeln!(
                    file,
                    "[{}] {}",
                    chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                    message
                );
            }
        }
    }
}
