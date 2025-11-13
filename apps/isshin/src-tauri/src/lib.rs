mod environment;
mod features;

use environment::app_state::AppState;
use environment::db::{Database, DatabaseState};
use features::app;
use features::hosts;
use features::process;
use features::tracking;
use specta_typescript::Typescript;
use tauri::{
    menu::{Menu, MenuBuilder, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager, WebviewWindow, WindowEvent,
};
use tauri_specta::{collect_commands, Builder};

fn show_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn setup_tray_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let show_dashboard =
        MenuItem::with_id(app, "show_dashboard", "Show Dashboard", true, None::<&str>)?;
    let show_settings =
        MenuItem::with_id(app, "show_settings", "Show Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    MenuBuilder::new(app)
        .item(&show_dashboard)
        .item(&show_settings)
        .separator()
        .item(&quit)
        .build()
}

fn handle_tray_menu_event(app: &AppHandle, event_id: &str) {
    match event_id {
        "show_dashboard" => show_window(app, "main"),
        "show_settings" => show_window(app, "settings"),
        "quit" => app.exit(0),
        _ => {}
    }
}

fn setup_window_close_handler(window: &WebviewWindow) {
    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = window_clone.hide();
        }
    });
}

fn setup_tray(app: &AppHandle) -> tauri::Result<TrayIcon<tauri::Wry>> {
    let menu = setup_tray_menu(app)?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Isshin")
        .on_menu_event(|app, event| handle_tray_menu_event(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle(), "main");
            }
        })
        .build(app)
}

#[tauri::command]
#[specta::specta]
fn show_settings_window(app: AppHandle) {
    show_window(&app, "settings");
}

#[tauri::command]
#[specta::specta]
fn is_exit_blocked(state: tauri::State<'_, AppState>) -> bool {
    state.is_exit_blocked()
}

#[tauri::command]
#[specta::specta]
fn set_exit_blocked(state: tauri::State<'_, AppState>, block: bool) {
    state.set_block_exit(block);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        process::commands::list_process,
        process::commands::max_running_process,
        process::commands::max_memory,
        process::commands::kill_process,
        app::commands::get_focused_application,
        hosts::commands::block_websites,
        hosts::commands::unblock_website,
        hosts::commands::get_blocked_websites,
        tracking::commands::get_activity_entries,
        tracking::commands::get_today_stats,
        tracking::commands::clear_tracking_data,
        show_settings_window,
        is_exit_blocked,
        set_exit_blocked
    ]);

    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::default().bigint(specta_typescript::BigIntExportBehavior::Number),
            "../src/environment/specta/bindings.ts",
        )
        .expect("Failed to export Typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            // https://docs.rs/tauri-specta/2.0.0-rc.21/tauri_specta/index.html
            builder.mount_events(app);

            // Initialize database
            let pool = tauri::async_runtime::block_on(async move {
                let database = Database::new()
                    .await
                    .expect("Failed to initialize database");
                return database.pool;
            });

            // Manage state
            app.manage(DatabaseState(pool.clone()));
            app.manage(AppState::new(true));

            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                let _ = setup_tray(app.handle());
            }

            // Setup window close handlers to hide instead of quit
            if let Some(main_window) = app.get_webview_window("main") {
                setup_window_close_handler(&main_window);
            }
            if let Some(settings_window) = app.get_webview_window("settings") {
                setup_window_close_handler(&settings_window);
            }

            // Start background activity monitoring
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tracking::monitor::start_monitoring(handle, pool).await;
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                // Check if exit blocking is enabled
                if let Some(state) = app_handle.try_state::<AppState>() {
                    if state.is_exit_blocked() {
                        api.prevent_exit();
                    }
                } else {
                    // If state not available, prevent exit as fallback
                    api.prevent_exit();
                }
            }
            _ => {}
        });
}
