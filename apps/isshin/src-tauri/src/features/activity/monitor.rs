use super::repository::ActivityRepository;
use super::types::ActivityEntry;
use crate::environment::logger::Logger;
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
        // No logging here - too verbose

        let app = self.app.clone();
        let current_entry = Arc::clone(&self.current_entry);

        tauri::async_runtime::spawn(async move {
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

pub fn start_monitoring(app: AppHandle) {
    // Check accessibility permissions on macOS
    #[cfg(target_os = "macos")]
    {
        if !mado::is_accessibility_trusted() {
            let msg = "[Activity Monitor] ERROR: Accessibility permissions not granted! Please enable in System Settings and restart the app.";
            eprintln!("{}", msg);
            Logger::log(&app, msg);

            // Show dialog to user
            let app_for_dialog = app.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
                app_for_dialog
                    .dialog()
                    .message("Isshin needs accessibility permissions to monitor your activity.\n\nPlease:\n1. Open System Settings > Privacy & Security > Accessibility\n2. Enable 'isshin'\n3. Restart the app")
                    .title("Accessibility Permission Required")
                    .kind(MessageDialogKind::Warning)
                    .show(|_| {});
            });

            return;
        }
        Logger::log(&app, "[Activity Monitor] Accessibility permissions: OK");
    }

    let handler = ActivityHandler::new(app.clone());

    // Create monitor with default config (tracks window changes, no browser URL extraction)
    let monitor = Monitor::new(handler);

    let app_for_thread = app.clone();

    // Use std::thread instead of Tokio because NSApplication::run() blocks indefinitely.
    // Tokio tasks must yield to the runtime, but this event loop runs forever until terminated.
    // A dedicated OS thread is the correct approach for long-running blocking operations.
    std::thread::spawn(move || {
        Logger::log(&app_for_thread, "[Activity Monitor] Monitor started");

        if let Err(e) = monitor.run() {
            let msg = format!("[Activity Monitor] ERROR: {}", e);
            eprintln!("{}", msg);
            Logger::log(&app_for_thread, &msg);
        }
    });
}
