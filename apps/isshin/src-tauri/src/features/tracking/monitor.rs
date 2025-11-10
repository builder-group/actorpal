use super::storage::ActivityStorage;
use super::types::ActivityEntry;
use active_win_pos_rs::get_active_window;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
struct ActivityUpdatePayload {
    application: String,
    window_title: Option<String>,
    duration_seconds: u64,
}

fn emit_activity_changed(
    handle: &AppHandle,
    app_name: String,
    window_title: Option<String>,
    duration_seconds: u64,
) {
    let _ = handle.emit(
        "activity_changed",
        ActivityUpdatePayload {
            application: app_name,
            window_title,
            duration_seconds,
        },
    );
}

fn emit_activity_updated(handle: &AppHandle, activity: &ActivityEntry) {
    let _ = handle.emit(
        "activity_updated",
        ActivityUpdatePayload {
            application: activity.application.clone(),
            window_title: activity.window_title.clone(),
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
        let window_title = if active_window.title.is_empty() {
            None
        } else {
            Some(active_window.title)
        };

        let mut current = current_activity.lock().unwrap();

        match current.as_mut() {
            Some(activity) if activity.application != app_name => {
                activity.update_end_time();
                save_activity(&storage, activity);

                *current = Some(ActivityEntry::new(app_name.clone(), window_title.clone()));
                emit_activity_changed(&handle, app_name, window_title, 0);
            }
            Some(activity) => {
                activity.update_end_time();
                emit_activity_updated(&handle, activity);
            }
            None => {
                *current = Some(ActivityEntry::new(app_name.clone(), window_title.clone()));
                emit_activity_changed(&handle, app_name, window_title, 0);
            }
        }
    }
}
