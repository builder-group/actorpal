use serde::{Deserialize, Serialize};
use sysinfo::{Process, ProcessStatus, System};

#[cfg(target_os = "macos")]
const APPLICATION_DIRS: &[&str] = &["/Applications", "/Users/*/Applications"];

const HELPER_KEYWORDS: &[&str] = &["helper", "service", "daemon", "agent", "."];

#[derive(Serialize, Deserialize)]
struct ProcessInfo {
    id: String,
    nume: String,
    running_time_formatted: String,
    memory_in_bytes: u64,
}

fn is_valid(process: &Process) -> bool {
    if let Some(exe_path) = process.exe().unwrap().to_str() {
        let is_in_app_dir = APPLICATION_DIRS.iter().any(|dir| exe_path.starts_with(dir));

        let is_helper = HELPER_KEYWORDS.iter().any(|keyword| {
            process
                .name()
                .to_string_lossy()
                .to_ascii_lowercase()
                .contains(keyword)
        });

        return process.status() == ProcessStatus::Run && is_in_app_dir && !is_helper;
    }

    return false;
}

fn format_running_time(seconds: u64) -> String {
    let days = seconds / 86400;
    let hours = (seconds % 86400) / 3600;
    let minutes = (seconds % 3600) / 60;
    let seconds = seconds % 60;
    return format!("{:02}d {:02}h {:02}m {:02}s", days, hours, minutes, seconds);
}

#[tauri::command]
fn max_running_process() -> Option<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    return sys
        .processes()
        .iter()
        .filter(|(_, process)| is_valid(process))
        .max_by_key(|(_, process)| process.run_time())
        .map(|(id, process)| ProcessInfo {
            id: id.to_string(),
            nume: process.name().to_string_lossy().into_owned(),
            running_time_formatted: format_running_time(process.run_time()),
            memory_in_bytes: process.memory(),
        });
}

#[tauri::command]
fn max_memory() -> Option<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    return sys
        .processes()
        .iter()
        .filter(|(_, process)| is_valid(process))
        .max_by_key(|(_, process)| process.memory())
        .map(|(id, process)| ProcessInfo {
            id: id.to_string(),
            nume: process.name().to_string_lossy().into_owned(),
            running_time_formatted: format_running_time(process.run_time()),
            memory_in_bytes: process.memory(),
        });
}

#[tauri::command]
fn list_process() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .filter(|(_, process)| is_valid(process))
        .map(|(id, process)| ProcessInfo {
            id: id.to_string(),
            nume: process.name().to_string_lossy().into_owned(),
            running_time_formatted: format_running_time(process.run_time()),
            memory_in_bytes: process.memory(),
        })
        .collect();

    processes.sort_by(|a, b| a.nume.to_lowercase().cmp(&b.nume.to_lowercase()));

    return processes;
}

#[tauri::command]
fn kill_process(id: &str) -> bool {
    let mut sys = System::new_all();
    sys.refresh_all();

    return sys
        .processes()
        .iter()
        .find(|(pid, _)| pid.to_string().eq_ignore_ascii_case(id))
        .map_or(false, |(_, process)| process.kill());
}

#[tauri::command]
fn get_focused_application() -> Option<String> {
    active_win_pos_rs::get_active_window()
        .ok()
        .map(|window| window.app_name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_process,
            max_running_process,
            max_memory,
            kill_process,
            get_focused_application
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
