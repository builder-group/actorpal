mod features;

use features::app;
use features::hosts;
use features::process;
use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

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
        hosts::commands::get_blocked_websites
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
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}
