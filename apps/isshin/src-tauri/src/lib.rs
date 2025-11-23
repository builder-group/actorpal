mod app;
mod common;
mod environment;
mod features;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app::run();
}
