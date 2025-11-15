use super::repository::ActivityRepository;
use super::types::ActivityEntry;
use crate::environment::states::db::DatabaseState;
use mado::{EventHandler, Monitor, WindowInfo};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;

struct ActivityHandler {
    app: AppHandle,
    current_entry: Arc<Mutex<Option<ActivityEntry>>>,
}

impl ActivityHandler {
    fn new(app: AppHandle) -> Self {
        Self {
            app,
            current_entry: Arc::new(Mutex::new(None)),
        }
    }
}

impl EventHandler for ActivityHandler {
    fn on_focus_change(&self, window: WindowInfo) {
        println!(
            "[Activity Monitor] Focus changed: {} - {}",
            window.app.name, window.title
        );

        let app = self.app.clone();
        let current_entry = Arc::clone(&self.current_entry);

        tokio::spawn(async move {
            // Save previous entry if it exists
            let mut entry_guard = current_entry.lock().await;
            if let Some(mut entry) = entry_guard.take() {
                entry.update_end_time();

                if entry.duration_seconds() > 0 {
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Err(e) = ActivityRepository::insert(&state.0.pool, &entry).await {
                            eprintln!("[Activity Monitor] Failed to save: {}", e);
                        } else {
                            println!(
                                "[Activity Monitor] Saved: {} ({}s)",
                                entry.application,
                                entry.duration_seconds()
                            );
                        }
                    }
                }
            }

            // Start new entry for this window
            let new_entry = ActivityEntry::from(window);
            *entry_guard = Some(new_entry);
        });
    }
}

pub async fn start_monitoring(app: AppHandle) {
    println!("[Activity Monitor] Starting activity monitoring");

    let handler = ActivityHandler::new(app);

    // Create monitor with default config (tracks window changes, no browser URL extraction)
    let monitor = Monitor::new(handler);

    // Run monitor (blocks until stopped)
    // This will run in the spawned task, so it won't block the main thread
    if let Err(e) = monitor.run() {
        eprintln!("[Activity Monitor] Error running monitor: {}", e);
    }
}
