use super::repository::{
    AppActivityRepository, AppRepository, InsertAppActivityInput, InsertWindowActivityInput,
    UpsertAppInput, WindowActivityRepository,
};
use super::types::{ActiveAppChangedEvent, ActiveWindowChangedEvent, AppInfoDto, WindowInfoDto};
use crate::common::time::current_timestamp;
use crate::environment::{
    logger::Logger,
    states::{db::DatabaseState, settings::SettingsState},
};
use mado::{MonitorConfig, WindowEvent, WindowListener, WindowMonitor};
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
                    println!("\n[Window Monitor] 🔄 App Activated: {}", app_info.name);
                }

                // Emit frontend event
                ActiveAppChangedEvent {
                    data: AppInfoDto::from(app_info.clone()),
                }
                .emit(&app)
                .unwrap_or_else(|e| eprintln!("[Window Monitor] Failed to emit app event: {}", e));

                tauri::async_runtime::spawn(async move {
                    let mut app_session_guard = app_session.lock().await;
                    let now = current_timestamp();

                    // Save previous app session if app changed
                    if let Some(prev_session) = app_session_guard.take() {
                        if prev_session.bundle_id != Some(app_info.bundle_id.clone()) {
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
                                bundle_id: Some(app_info.bundle_id.clone()),
                                name: Some(app_info.name.clone()),
                                process_path: Some(app_info.process_path.clone()),
                            },
                        )
                        .await
                        {
                            *app_session_guard = Some(AppSession {
                                app_id,
                                bundle_id: Some(app_info.bundle_id),
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
                    println!(
                        "\n[Window Monitor] 🪟 Window Changed: {}",
                        window_info.title
                    );
                }

                // Emit frontend event
                ActiveWindowChangedEvent {
                    data: WindowInfoDto::from(window_info.clone()),
                }
                .emit(&app)
                .unwrap_or_else(|e| eprintln!("[Window Monitor] Failed to emit event: {}", e));

                tauri::async_runtime::spawn(async move {
                    let mut window_session_guard = window_session.lock().await;
                    let now = current_timestamp();

                    // Save previous window session if window changed
                    if let Some(prev_session) = window_session_guard.take() {
                        if prev_session.bundle_id != Some(window_info.app.bundle_id.clone())
                            || prev_session.window_title != Some(window_info.title.clone())
                        {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let _ = WindowActivityRepository::insert(
                                    &state.pool,
                                    &InsertWindowActivityInput {
                                        app_id: prev_session.app_id,
                                        window_title: prev_session.window_title.clone(),
                                        window_id: prev_session.window_id,
                                        window_x: prev_session.window_x,
                                        window_y: prev_session.window_y,
                                        window_width: prev_session.window_width,
                                        window_height: prev_session.window_height,
                                        browser_url: prev_session.browser_url.clone(),
                                        browser_is_private: prev_session.browser_is_private,
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
                                bundle_id: Some(window_info.app.bundle_id.clone()),
                                name: Some(window_info.app.name.clone()),
                                process_path: Some(window_info.app.process_path.clone()),
                            },
                        )
                        .await
                        {
                            *window_session_guard = Some(WindowSession {
                                app_id,
                                bundle_id: Some(window_info.app.bundle_id),
                                window_title: Some(window_info.title),
                                window_id: Some(window_info.window_id),
                                window_x: Some(window_info.bounds.x),
                                window_y: Some(window_info.bounds.y),
                                window_width: Some(window_info.bounds.width),
                                window_height: Some(window_info.bounds.height),
                                browser_url: window_info
                                    .browser
                                    .as_ref()
                                    .and_then(|b| b.url.clone()),
                                browser_is_private: window_info
                                    .browser
                                    .as_ref()
                                    .and_then(|b| b.is_private),
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
    window_x: Option<f64>,
    window_y: Option<f64>,
    window_width: Option<f64>,
    window_height: Option<f64>,
    browser_url: Option<String>,
    browser_is_private: Option<bool>,
    start_time: i64,
}
