pub mod tray;
pub mod window;

use crate::{
    common::db::Database,
    environment::states::{app::AppState, blocking::BlockingState},
    features::{
        activity,
        activity_window::{
            commands as activity_commands,
            types::{ActiveAppChangedEvent, ActiveWindowChangedEvent},
        },
        blocking::{self, commands as blocking_commands},
        settings::commands as settings_commands,
    },
};
use specta_typescript::Typescript;
use tauri::Manager;
use tauri_specta::{collect_commands, collect_events, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // Settings commands
            settings_commands::show_settings_window,
            settings_commands::get_database_path,
            settings_commands::open_database_directory,
            settings_commands::get_settings,
            settings_commands::set_settings,
            // Activity commands
            activity_commands::get_app_activities,
            activity_commands::get_window_activities,
            activity_commands::clear_app_activities,
            activity_commands::clear_window_activities,
            activity_commands::get_current_active_app,
            activity_commands::get_current_active_window,
            // Blocking commands
            blocking_commands::start_blocking,
            blocking_commands::stop_blocking,
            blocking_commands::get_blocking_state,
        ])
        .events(collect_events![
            ActiveAppChangedEvent,
            ActiveWindowChangedEvent
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
            let database = tauri::async_runtime::block_on(async {
                return Database::new(app)
                    .await
                    .expect("Failed to initialize database");
            });

            // Load settings from disk
            let settings = crate::features::settings::persistence::load_settings(app);

            // Manage state
            app.manage(database);
            app.manage(AppState::new());
            app.manage(std::sync::Mutex::new(settings));
            app.manage(BlockingState::default());

            #[cfg(target_os = "macos")]
            {
                use crate::app::tray::Tray;

                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                let _ = Tray::setup(app.handle());
            }

            // Setup features
            activity::setup(app.handle().clone());
            blocking::setup(app.handle().clone());

            // Show main window asynchronously
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = window::ShowWindow::Main.show(&app_handle).await;
            });

            return Ok(());
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let label = window.label();

                // Only hide main window (can be reopened from tray)
                // to prevent the app from exiting when the main window is closed
                if label == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, _event| {});
}
