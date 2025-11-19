use super::repository::ActivityRepository;
use super::types::{ActiveWindowChangedEvent, ActiveWindowInfo, ActivityEntry};
use crate::environment::logger::Logger;
use crate::environment::states::db::DatabaseState;
use crate::environment::states::settings::SettingsState;
use mado::{MonitorConfig, WindowEvent, WindowInfo, WindowListener, WindowMonitor};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;
use tokio::sync::Mutex as TokioMutex;

struct ActivityHandler {
    app: AppHandle,
    active_entry: Arc<TokioMutex<Option<ActivityEntry>>>,
}

impl ActivityHandler {
    fn new(app: AppHandle) -> Self {
        Self {
            app,
            active_entry: Arc::new(TokioMutex::new(None)),
        }
    }
}

impl WindowListener for ActivityHandler {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app } => {
                #[cfg(debug_assertions)]
                {
                    println!("\n[Activity Window Watcher] 🔄 App Activated: {}", app.name);
                }
                // App activated but no window yet - wait for WindowChanged event
            }
            WindowEvent::WindowChanged { window } => {
                let app = self.app.clone();
                let active_entry = Arc::clone(&self.active_entry);

                #[cfg(debug_assertions)]
                {
                    let app_changed = {
                        let entry_guard = tauri::async_runtime::block_on(active_entry.lock());
                        entry_guard
                            .as_ref()
                            .and_then(|e| e.bundle_id.as_ref())
                            .map(|bundle_id| bundle_id != &window.app.bundle_id)
                            .unwrap_or(true)
                    };
                    log_window_info(&window, app_changed);
                }

                ActiveWindowChangedEvent {
                    data: ActiveWindowInfo::from(window.clone()),
                }
                .emit(&app)
                .unwrap_or_else(|e| {
                    eprintln!("[Activity Window Watcher] Failed to emit event: {}", e)
                });

                tauri::async_runtime::spawn(async move {
                    // Save previous entry if it exists
                    let mut entry_guard = active_entry.lock().await;
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
                                        eprintln!(
                                            "[Activity Window Watcher] Failed to save: {}",
                                            e
                                        );
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

fn log_window_info(window: &WindowInfo, app_changed: bool) {
    if app_changed {
        println!("\n[Activity Window Watcher] 🔄 App Switch");
    } else {
        println!("\n[Activity Window Watcher] 🪟 Window Change");
    }

    println!("[Activity Window Watcher]    Window:");
    println!(
        "[Activity Window Watcher]       Title:      '{}'",
        window.title
    );
    println!(
        "[Activity Window Watcher]       Window ID:  {}",
        window.window_id
    );
    println!(
        "[Activity Window Watcher]       Bounds:     ({:.0}, {:.0})",
        window.bounds.x, window.bounds.y
    );
    println!(
        "[Activity Window Watcher]       Size:       {:.0}x{:.0}",
        window.bounds.width, window.bounds.height
    );

    println!("[Activity Window Watcher]    App:");
    println!(
        "[Activity Window Watcher]       Name:       {}",
        window.app.name
    );
    println!(
        "[Activity Window Watcher]       PID:        {}",
        window.app.pid
    );
    println!(
        "[Activity Window Watcher]       Bundle ID:  {}",
        window.app.bundle_id
    );
    println!(
        "[Activity Window Watcher]       Path:       {}",
        window.app.process_path
    );

    if let Some(browser) = &window.browser {
        println!("[Activity Window Watcher]    Browser:");
        if let Some(url) = &browser.url {
            println!("[Activity Window Watcher]       URL:        {}", url);
        } else {
            println!("[Activity Window Watcher]       URL:        (not available - may need Automation permission)");
        }
        if let Some(is_private) = browser.is_private {
            if is_private {
                println!("[Activity Window Watcher]       Mode:       Private/Incognito");
            }
        }
    }
}
