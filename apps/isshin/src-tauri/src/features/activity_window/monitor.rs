use super::repository::{
    AppActivityRepository, AppRepository, InsertAppActivityInput, InsertWindowActivityInput,
    UpsertAppInput, WindowActivityRepository,
};
use super::types::{ActiveAppChangedEvent, ActiveWindowChangedEvent};
use crate::common::time::current_timestamp;
use crate::environment::{
    logger::Logger,
    states::{db::DatabaseState, settings::SettingsState},
};
use mado::{BrowserInfo, MonitorConfig, WindowBounds, WindowEvent, WindowListener, WindowMonitor};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;
use tokio::sync::Mutex as TokioMutex;

pub fn start_monitoring(app: AppHandle) {
    let settings = app
        .try_state::<SettingsState>()
        .map(|state| state.lock().unwrap().activity_window.clone())
        .unwrap_or_default();

    #[cfg(target_os = "macos")]
    {
        // Check accessibility permissions
        if settings.track_window && !mado::is_accessibility_trusted() {
            let msg = "[Window Monitor] ERROR: Accessibility permissions not granted! Please enable in System Settings and restart the app.";
            eprintln!("{}", msg);
            Logger::log(&app, msg);

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
    }

    // Initialize monitor with handler
    let handler = WindowMonitorHandler::new(app.clone());
    let config = MonitorConfig {
        allow_browser: settings.track_browser,
        track_window_changes: settings.track_window,
    };
    let monitor = WindowMonitor::with_config(handler, config);

    // Run monitor in separate thread
    let app_for_thread = app.clone();
    std::thread::spawn(move || {
        Logger::log(&app_for_thread, "[Window Monitor] Started");

        if let Err(e) = monitor.run() {
            let msg = format!("[Window Monitor] ERROR: {}", e);
            eprintln!("{}", msg);
            Logger::log(&app_for_thread, &msg);
        }
    });
}

struct WindowMonitorHandler {
    app: AppHandle,
    app_session: Arc<TokioMutex<Option<AppSession>>>,
    window_session: Arc<TokioMutex<Option<WindowSession>>>,
}

impl WindowMonitorHandler {
    fn new(app: AppHandle) -> Self {
        Self {
            app,
            app_session: Arc::new(TokioMutex::new(None)),
            window_session: Arc::new(TokioMutex::new(None)),
        }
    }
}

impl WindowListener for WindowMonitorHandler {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app: app_info } => {
                let app = self.app.clone();
                let app_session = Arc::clone(&self.app_session);

                #[cfg(debug_assertions)]
                {
                    println!("\n[Window Monitor] 🔄 App Activated:\n{}", app_info);
                }

                // Emit frontend event
                ActiveAppChangedEvent {
                    data: app_info.clone(),
                }
                .emit(&app)
                .unwrap_or_else(|e| eprintln!("[Window Monitor] Failed to emit app event: {}", e));

                tauri::async_runtime::spawn(async move {
                    let mut app_session_guard = app_session.lock().await;
                    let now = current_timestamp();

                    // Save previous app session if app changed
                    if let Some(prev_session) = app_session_guard.take() {
                        if prev_session.bundle_id != app_info.bundle_id {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let _ = AppActivityRepository::insert(
                                    &state.pool,
                                    &InsertAppActivityInput {
                                        app_id: prev_session.app_id,
                                        start_time: prev_session.start_time,
                                        end_time: now,
                                    },
                                )
                                .await;
                            }
                        } else {
                            // Same app reactivated, restore session
                            *app_session_guard = Some(prev_session);
                            return;
                        }
                    }

                    // Upsert new app info and start new app session
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Ok(app_id) = AppRepository::upsert(
                            &state.pool,
                            &UpsertAppInput {
                                bundle_id: app_info.bundle_id.clone(),
                                name: app_info.name,
                                process_path: app_info.process_path,
                            },
                        )
                        .await
                        {
                            *app_session_guard = Some(AppSession {
                                app_id,
                                bundle_id: app_info.bundle_id,
                                start_time: now,
                            });
                        }
                    }
                });
            }
            WindowEvent::WindowChanged {
                window: window_info,
            } => {
                let app = self.app.clone();
                let window_session = Arc::clone(&self.window_session);

                #[cfg(debug_assertions)]
                {
                    println!("\n[Window Monitor] 🪟 Window Changed:\n{}", window_info);
                }

                // Emit frontend event
                ActiveWindowChangedEvent {
                    data: window_info.clone(),
                }
                .emit(&app)
                .unwrap_or_else(|e| eprintln!("[Window Monitor] Failed to emit event: {}", e));

                tauri::async_runtime::spawn(async move {
                    let mut window_session_guard = window_session.lock().await;
                    let now = current_timestamp();

                    // Save previous window session if window changed
                    if let Some(prev_session) = window_session_guard.take() {
                        if prev_session.bundle_id != window_info.app.bundle_id
                            || prev_session.window_title != window_info.title
                        {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let _ = WindowActivityRepository::insert(
                                    &state.pool,
                                    &InsertWindowActivityInput {
                                        app_id: prev_session.app_id,
                                        window_title: prev_session.window_title,
                                        window_id: prev_session.window_id,
                                        window_bounds: prev_session.window_bounds,
                                        browser: prev_session.browser,
                                        start_time: prev_session.start_time,
                                        end_time: now,
                                    },
                                )
                                .await;
                            }
                        } else {
                            // Same window, restore session
                            *window_session_guard = Some(prev_session);
                            return;
                        }
                    }

                    // Upsert new app info and start new window session
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Ok(app_id) = AppRepository::upsert(
                            &state.pool,
                            &UpsertAppInput {
                                bundle_id: window_info.app.bundle_id.clone(),
                                name: window_info.app.name,
                                process_path: window_info.app.process_path,
                            },
                        )
                        .await
                        {
                            *window_session_guard = Some(WindowSession {
                                app_id,
                                bundle_id: window_info.app.bundle_id,
                                window_title: window_info.title,
                                window_id: window_info.window_id,
                                window_bounds: window_info.bounds,
                                browser: window_info.browser,
                                start_time: now,
                            });
                        }
                    }
                });
            }
        }
    }
}

struct AppSession {
    app_id: i64,
    bundle_id: Option<String>,
    start_time: i64,
}

struct WindowSession {
    app_id: i64,
    bundle_id: Option<String>,
    window_title: Option<String>,
    window_id: Option<u32>,
    window_bounds: Option<WindowBounds>,
    browser: Option<BrowserInfo>,
    start_time: i64,
}
