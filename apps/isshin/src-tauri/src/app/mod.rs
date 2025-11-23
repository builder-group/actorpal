pub mod tray;
pub mod window;

use crate::{
    app::window::Window,
    common::db::Database,
    environment::states::{app::AppState, blocking::BlockingState, settings::SettingsState},
    features::{
        activity,
        activity_window::{
            commands as activity_commands,
            types::{ActiveAppChangedEvent, ActiveWindowChangedEvent},
        },
        blocking::{self, commands as blocking_commands},
        settings::{self, commands as settings_commands},
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

            // Manage state
            app.manage(database);
            app.manage(AppState::new());
            app.manage(SettingsState::default());
            app.manage(BlockingState::default());

            #[cfg(target_os = "macos")]
            {
                use crate::app::tray::Tray;

                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                let _ = Tray::setup(app.handle());
            }

            // Setup windows
            Window::Main.setup(app.handle());
            Window::Settings.setup(app.handle());

            // Setup features
            activity::setup(app.handle().clone());
            settings::setup(app.handle().clone());
            blocking::setup(app.handle().clone());

            return Ok(());
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, _event| {});
}
