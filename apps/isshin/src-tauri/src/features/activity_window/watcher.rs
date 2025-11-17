use super::repository::ActivityRepository;
use super::types::{ActiveWindowChangedEvent, ActiveWindowInfo, ActivityEntry};
use crate::environment::logger::Logger;
use crate::environment::states::db::DatabaseState;
use crate::environment::states::settings::SettingsState;
use mado::{MonitorConfig, WindowInfo, WindowListener, WindowMonitor};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;
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

impl WindowListener for ActivityHandler {
    fn on_focus_change(&self, window: WindowInfo) {
        let app = self.app.clone();
        let current_entry = Arc::clone(&self.current_entry);

        ActiveWindowChangedEvent {
            data: ActiveWindowInfo::from(window.clone()),
        }
        .emit(&app)
        .unwrap_or_else(|e| eprintln!("[Activity Window Watcher] Failed to emit event: {}", e));

        tauri::async_runtime::spawn(async move {
            // Save previous entry if it exists
            let mut entry_guard = current_entry.lock().await;
            if let Some(mut entry) = entry_guard.take() {
                entry.update_end_time();

                if entry.duration_seconds() > 0 {
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        match ActivityRepository::insert(&state.pool, &entry).await {
                            Ok(_) => {
                                println!(
                                    "[Activity Window Watcher] Saved: {} ({}s)",
                                    entry.application,
                                    entry.duration_seconds()
                                );
                            }
                            Err(e) => {
                                eprintln!("[Activity Window Watcher] Failed to save: {}", e);
                            }
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
    let settings = app
        .try_state::<SettingsState>()
        .map(|state| state.lock().unwrap().activity_window.clone())
        .unwrap_or_default();

    // Check accessibility permissions on macOS (only needed if tracking window changes)
    #[cfg(target_os = "macos")]
    {
        if settings.track_window && !mado::is_accessibility_trusted() {
            let msg = "[Activity Window Watcher] ERROR: Accessibility permissions not granted! Please enable in System Settings and restart the app.";
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
        if settings.track_window {
            Logger::log(
                &app,
                "[Activity Window Watcher] Accessibility permissions: OK",
            );
        }
    }

    let handler = ActivityHandler::new(app.clone());

    // Create monitor with config from settings
    let config = MonitorConfig {
        allow_browser: settings.track_browser,
        track_window_changes: settings.track_window,
    };
    let monitor = WindowMonitor::with_config(handler, config);

    let app_for_thread = app.clone();

    // Use std::thread because the monitor's event loop blocks indefinitely.
    // Tokio tasks must yield, but this runs forever until terminated.
    std::thread::spawn(move || {
        Logger::log(&app_for_thread, "[Activity Window Watcher] Started");

        if let Err(e) = monitor.run() {
            let msg = format!("[Activity Window Watcher] ERROR: {}", e);
            eprintln!("{}", msg);
            Logger::log(&app_for_thread, &msg);
        }
    });
}
