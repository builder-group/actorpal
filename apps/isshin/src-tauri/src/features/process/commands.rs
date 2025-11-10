use serde::{Deserialize, Serialize};
use sysinfo::{Process, ProcessStatus, System};

#[cfg(target_os = "macos")]
const APPLICATION_DIRS: &[&str] = &["/Applications", "/Users/*/Applications"];

const HELPER_KEYWORDS: &[&str] = &["helper", "service", "daemon", "agent", "."];

#[derive(Serialize, Deserialize)]
pub struct ProcessInfo {
    pub id: String,
    pub nume: String,
    pub running_time_formatted: String,
    pub memory_in_bytes: u64,
}

fn is_valid_process(process: &Process) -> bool {
    let exe_path = match process.exe().and_then(|p| p.to_str()) {
        Some(path) => path,
        None => return false,
    };

    #[cfg(target_os = "macos")]
    let is_in_app_dir = APPLICATION_DIRS.iter().any(|dir| exe_path.starts_with(dir));
    #[cfg(not(target_os = "macos"))]
    let is_in_app_dir = true;

    let is_helper = HELPER_KEYWORDS.iter().any(|keyword| {
        process
            .name()
            .to_string_lossy()
            .to_ascii_lowercase()
            .contains(keyword)
    });

    process.status() == ProcessStatus::Run && is_in_app_dir && !is_helper
}

fn format_running_time(seconds: u64) -> String {
    let days = seconds / 86400;
    let hours = (seconds % 86400) / 3600;
    let minutes = (seconds % 3600) / 60;
    let secs = seconds % 60;
    format!("{:02}d {:02}h {:02}m {:02}s", days, hours, minutes, secs)
}

fn create_process_info(id: &sysinfo::Pid, process: &Process) -> ProcessInfo {
    ProcessInfo {
        id: id.to_string(),
        nume: process.name().to_string_lossy().into_owned(),
        running_time_formatted: format_running_time(process.run_time()),
        memory_in_bytes: process.memory(),
    }
}

fn get_system_with_processes() -> System {
    let mut sys = System::new_all();
    sys.refresh_all();
    sys
}

#[tauri::command]
pub fn list_process() -> Vec<ProcessInfo> {
    let sys = get_system_with_processes();

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .filter(|(_, process)| is_valid_process(process))
        .map(|(id, process)| create_process_info(id, process))
        .collect();

    processes.sort_by(|a, b| a.nume.to_lowercase().cmp(&b.nume.to_lowercase()));
    processes
}

#[tauri::command]
pub fn max_running_process() -> Option<ProcessInfo> {
    let sys = get_system_with_processes();

    sys.processes()
        .iter()
        .filter(|(_, process)| is_valid_process(process))
        .max_by_key(|(_, process)| process.run_time())
        .map(|(id, process)| create_process_info(id, process))
}

#[tauri::command]
pub fn max_memory() -> Option<ProcessInfo> {
    let sys = get_system_with_processes();

    sys.processes()
        .iter()
        .filter(|(_, process)| is_valid_process(process))
        .max_by_key(|(_, process)| process.memory())
        .map(|(id, process)| create_process_info(id, process))
}

#[tauri::command]
pub fn kill_process(id: &str) -> bool {
    let sys = get_system_with_processes();

    sys.processes()
        .iter()
        .find(|(pid, _)| pid.to_string().eq_ignore_ascii_case(id))
        .map_or(false, |(_, process)| process.kill())
}
