use super::storage::ActivityStorage;
use super::types::ActivityEntry;
use active_win_pos_rs::get_active_window;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::{Pid, System};
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
struct ActivityUpdatePayload {
    application: String,
    bundle_id: Option<String>,
    window_title: Option<String>,
    url: Option<String>,
    duration_seconds: u64,
}

fn emit_activity_changed(
    handle: &AppHandle,
    app_name: String,
    bundle_id: Option<String>,
    window_title: Option<String>,
    url: Option<String>,
    duration_seconds: u64,
) {
    let _ = handle.emit(
        "activity_changed",
        ActivityUpdatePayload {
            application: app_name,
            bundle_id,
            window_title,
            url,
            duration_seconds,
        },
    );
}

fn emit_activity_updated(handle: &AppHandle, activity: &ActivityEntry) {
    let _ = handle.emit(
        "activity_updated",
        ActivityUpdatePayload {
            application: activity.application.clone(),
            bundle_id: activity.bundle_id.clone(),
            window_title: activity.window_title.clone(),
            url: activity.url.clone(),
            duration_seconds: activity.duration_seconds,
        },
    );
}

fn save_activity(storage: &Arc<Mutex<ActivityStorage>>, activity: &ActivityEntry) {
    if activity.duration_seconds > 0 {
        let mut storage_guard = storage.lock().unwrap();
        storage_guard.add_entry(activity.clone());

        if let Err(e) = storage_guard.save() {
            eprintln!("Failed to save activity: {}", e);
        }
    }
}

#[cfg(target_os = "macos")]
fn get_bundle_id_from_process(process_id: u64) -> Option<String> {
    use std::process::Command;

    // Use AppleScript to get bundle ID from process name (more reliable than parsing paths)
    // First, get the app name from the process
    let mut sys = System::new_all();
    sys.refresh_all();

    // Convert u64 to Pid (Pid is typically u32 on most systems)
    let pid = Pid::from(process_id as usize);

    if let Some(process) = sys.process(pid) {
        // Try to get bundle ID using AppleScript with the executable name
        if let Some(exe_path) = process.exe().and_then(|p| p.to_str()) {
            // Extract app name from path (e.g., "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" -> "Google Chrome")
            let app_name = exe_path
                .split('/')
                .find(|s| s.ends_with(".app"))
                .and_then(|s| s.strip_suffix(".app"))
                .or_else(|| {
                    // Fallback: use the executable name
                    exe_path.split('/').last()
                });

            if let Some(name) = app_name {
                // Use AppleScript to get bundle ID: `id of application "App Name"`
                let script = format!(r#"id of application "{}""#, name);
                if let Ok(output) = Command::new("osascript").arg("-e").arg(&script).output() {
                    if output.status.success() {
                        let bundle_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        if !bundle_id.is_empty() {
                            return Some(bundle_id);
                        }
                    }
                }
            }
        }
    }

    None
}

#[cfg(not(target_os = "macos"))]
fn get_bundle_id_from_process(_process_id: u64) -> Option<String> {
    None
}

fn get_url_via_applescript(bundle_id: &str) -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Skip Firefox as it doesn't support AppleScript well
        if bundle_id.contains("firefox") || bundle_id.contains("Firefox") {
            return None;
        }

        // AppleScript to get active tab URL (requires Automation permission)
        let script = format!(
            r#"
            tell application id "{}"
                if (count of windows) > 0 then
                    set activeTab to active tab of front window
                    return URL of activeTab
                end if
            end tell
            "#,
            bundle_id
        );

        match Command::new("osascript").arg("-e").arg(&script).output() {
            Ok(output) => {
                if output.status.success() {
                    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !url.is_empty()
                        && (url.starts_with("http://") || url.starts_with("https://"))
                    {
                        println!("[AppleScript] Got URL from {}: {}", bundle_id, url);
                        return Some(url);
                    }
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    if error.contains("not allowed") || error.contains("denied") {
                        println!("[AppleScript] Automation permission not granted for {}. Enable in System Settings > Privacy & Security > Automation", bundle_id);
                    }
                }
            }
            Err(e) => {
                println!("[AppleScript] Failed to execute for {}: {}", bundle_id, e);
            }
        }
    }

    None
}

pub async fn start_monitoring(handle: AppHandle) {
    let storage = Arc::new(Mutex::new(ActivityStorage::load().unwrap_or_default()));
    let current_activity = Arc::new(Mutex::new(None::<ActivityEntry>));

    loop {
        tokio::time::sleep(Duration::from_secs(5)).await;

        let active_window = match get_active_window() {
            Ok(window) => window,
            Err(_) => continue,
        };

        let app_name = active_window.app_name;
        let process_id = active_window.process_id;
        let window_title = if active_window.title.is_empty() {
            None
        } else {
            Some(active_window.title)
        };

        // Get bundle ID from process (cleaner than app name matching)
        let bundle_id = get_bundle_id_from_process(process_id);

        // Try to get URL via AppleScript for browsers (requires Automation permission)
        // Only try if we have a bundle ID (indicates it's a proper macOS app)
        let url = if let Some(ref bid) = bundle_id {
            // Check if it's a known browser bundle ID
            let is_browser = bid.contains("chrome")
                || bid.contains("safari")
                || bid.contains("firefox")
                || bid.contains("edge")
                || bid.contains("brave")
                || bid.contains("opera")
                || bid.contains("arc")
                || bid.contains("Browser");

            if is_browser {
                get_url_via_applescript(bid)
            } else {
                None
            }
        } else {
            None
        };

        // Log browser activity with URL if available
        if let Some(ref bid) = bundle_id {
            let is_browser = bid.contains("chrome")
                || bid.contains("safari")
                || bid.contains("firefox")
                || bid.contains("edge")
                || bid.contains("brave")
                || bid.contains("opera")
                || bid.contains("arc")
                || bid.contains("Browser");

            if is_browser {
                if let Some(ref url_val) = url {
                    println!(
                        "[Browser Tracking] App: {} ({}), Title: '{:?}', URL: {}",
                        app_name, bid, window_title, url_val
                    );
                } else if let Some(ref title) = window_title {
                    println!(
                        "[Browser Tracking] App: {} ({}), Title: '{}' (no URL - may need Automation permission)",
                        app_name, bid, title
                    );
                }
            }
        }

        // Determine the identifier for comparison (bundle_id if available, otherwise app_name)
        let current_identifier = bundle_id
            .as_ref()
            .map(|bid| bid.clone())
            .unwrap_or_else(|| app_name.clone());

        let mut current = current_activity.lock().unwrap();

        match current.as_mut() {
            Some(activity) if activity.identifier() != current_identifier => {
                // Activity changed (different app/bundle)
                activity.update_end_time();
                save_activity(&storage, activity);

                *current = Some(ActivityEntry::new(
                    app_name.clone(),
                    bundle_id.clone(),
                    window_title.clone(),
                    url.clone(),
                ));
                emit_activity_changed(&handle, app_name, bundle_id.clone(), window_title, url, 0);
            }
            Some(activity) => {
                // Same activity, just update duration
                activity.update_end_time();
                emit_activity_updated(&handle, activity);
            }
            None => {
                // First activity
                *current = Some(ActivityEntry::new(
                    app_name.clone(),
                    bundle_id.clone(),
                    window_title.clone(),
                    url.clone(),
                ));
                emit_activity_changed(&handle, app_name, bundle_id.clone(), window_title, url, 0);
            }
        }
    }
}
