pub mod tray;
pub mod window;

use crate::app::window::Window;
use crate::common::db::Database;
use crate::environment::states::app::AppState;
use crate::environment::states::db::DatabaseState;
use crate::features::activity;
use crate::features::activity::commands as activity_commands;
use crate::features::settings;
use crate::features::settings::commands as settings_commands;
use specta_typescript::Typescript;
use tauri::Manager;
use tauri_specta::{collect_commands, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        // Settings commands
        settings_commands::show_settings_window,
        settings_commands::get_database_path,
        // Activity commands
        activity_commands::get_activity_entries,
        activity_commands::clear_activity_entries,
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
            app.manage(DatabaseState(database));
            app.manage(AppState::new());

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

            return Ok(());
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, _event| {});
}
