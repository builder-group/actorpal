mod environment;
mod features;
mod library;
mod windows;

use environment::states::app::AppState;
use environment::states::db::DatabaseState;
use features::activity;
use features::activity::commands as activity_commands;
use features::settings;
use features::settings::commands as settings_commands;
use library::db::Database;
use library::tray::Tray;
use specta_typescript::Typescript;
use tauri::Manager;
use tauri_specta::{collect_commands, Builder};
use windows::Window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        // Settings commands
        settings_commands::show_settings_window,
        settings_commands::is_exit_blocked,
        settings_commands::set_exit_blocked,
        // Activity commands
        activity_commands::get_activity_entries,
        activity_commands::get_activity_entries_since,
        activity_commands::insert_activity_entry,
        activity_commands::delete_all_activity_entries,
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
            app.manage(AppState::new(true));

            #[cfg(target_os = "macos")]
            {
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
