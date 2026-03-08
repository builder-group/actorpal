use crate::environment::{logger::Logger, states::blocking::BlockingState};
use crate::features::blocking::types::BlockingState as BlockingStateType;
use tauri::{AppHandle, State};

#[tauri::command]
#[specta::specta]
pub async fn start_blocking(
    blocked_sites: Vec<String>,
    blocked_apps: Vec<String>,
    app: AppHandle,
    state: State<'_, BlockingState>,
) -> Result<(), String> {
    let mut blocking = state.lock().unwrap();
    blocking.is_active = true;
    blocking.blocked_sites = blocked_sites.clone();
    blocking.blocked_apps = blocked_apps.clone();

    let sites_list = if blocked_sites.is_empty() {
        "none".to_string()
    } else {
        blocked_sites.join(", ")
    };
    let apps_list = if blocked_apps.is_empty() {
        "none".to_string()
    } else {
        blocked_apps.join(", ")
    };
    let msg = format!(
        "[Blocker] 🚫 Started blocking - Sites: {}, Apps: {}",
        sites_list, apps_list
    );
    Logger::log(&app, &msg);
    eprintln!("{}", msg);

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn stop_blocking(app: AppHandle, state: State<'_, BlockingState>) -> Result<(), String> {
    let mut blocking = state.lock().unwrap();
    let was_active = blocking.is_active;
    let sites_count = blocking.blocked_sites.len();
    let apps_count = blocking.blocked_apps.len();
    blocking.is_active = false;
    blocking.blocked_sites.clear();
    blocking.blocked_apps.clear();

    if was_active {
        let msg = format!(
            "[Blocker] ✅ Stopped blocking (was blocking {} site(s), {} app(s))",
            sites_count, apps_count
        );
        Logger::log(&app, &msg);
        eprintln!("{}", msg);
    }

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn get_blocking_state(
    state: State<'_, BlockingState>,
) -> Result<BlockingStateType, String> {
    return Ok(state.lock().unwrap().clone());
}
