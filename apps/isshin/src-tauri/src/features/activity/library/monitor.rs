use crate::environment::states::db::DatabaseState;
use crate::features::activity::library::repository::ActivityRepository;
use crate::features::activity::types::ActivityEntry;
use mado::{EventHandler, Monitor, WindowInfo};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;

struct ActivityHandler {
    app: AppHandle,
    current_entry: Arc<Mutex<Option<ActivityEntry>>>,
    last_identifier: Arc<Mutex<Option<String>>>,
}

impl ActivityHandler {
    fn new(app: AppHandle) -> Self {
        Self {
            app,
            current_entry: Arc::new(Mutex::new(None)),
            last_identifier: Arc::new(Mutex::new(None)),
        }
    }

    fn get_identifier(window: &WindowInfo) -> String {
        if window.app.bundle_id.is_empty() {
            window.app.name.clone()
        } else {
            window.app.bundle_id.clone()
        }
    }

    async fn save_current_entry(&self) {
        let mut entry_guard = self.current_entry.lock().await;
        if let Some(mut entry) = entry_guard.take() {
            entry.update_end_time();

            if entry.duration_seconds > 0 {
                if let Some(state) = self.app.try_state::<DatabaseState>() {
                    if let Err(e) = ActivityRepository::insert(&state.0.pool, &entry).await {
                        eprintln!("[Activity Monitor] Failed to save activity entry: {}", e);
                    } else {
                        println!(
                            "[Activity Monitor] Saved: {} ({}s)",
                            entry.application, entry.duration_seconds
                        );
                    }
                }
            }
        }
    }

    async fn start_new_entry(&self, window: &WindowInfo) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let url = window.browser.as_ref().and_then(|b| b.url.clone());

        let bundle_id = if window.app.bundle_id.is_empty() {
            None
        } else {
            Some(window.app.bundle_id.clone())
        };

        let entry = ActivityEntry {
            application: window.app.name.clone(),
            bundle_id,
            window_title: Some(window.title.clone()),
            url,
            start_time: now,
            end_time: now,
            duration_seconds: 0,
        };

        let mut entry_guard = self.current_entry.lock().await;
        *entry_guard = Some(entry);
    }
}

impl EventHandler for ActivityHandler {
    fn on_focus_change(&self, window: WindowInfo) {
        let identifier = Self::get_identifier(&window);
        let app = self.app.clone();
        let current_entry = Arc::clone(&self.current_entry);
        let last_identifier = Arc::clone(&self.last_identifier);

        tokio::spawn(async move {
            let mut last_id_guard = last_identifier.lock().await;
            let activity_changed = last_id_guard.as_deref() != Some(&identifier);

            if activity_changed {
                // Save previous entry if it exists
                let handler = ActivityHandler {
                    app: app.clone(),
                    current_entry: Arc::clone(&current_entry),
                    last_identifier: Arc::clone(&last_identifier),
                };
                handler.save_current_entry().await;

                // Start new entry
                handler.start_new_entry(&window).await;

                *last_id_guard = Some(identifier.clone());

                println!(
                    "[Activity Monitor] Activity changed: {} - {}",
                    window.app.name, window.title
                );
            } else {
                // Same app, but window/tab might have changed
                // Update the current entry's window title and URL
                let mut entry_guard = current_entry.lock().await;
                if let Some(ref mut entry) = *entry_guard {
                    entry.window_title = Some(window.title.clone());
                    if let Some(ref browser) = window.browser {
                        entry.url = browser.url.clone();
                    }
                }
            }
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
