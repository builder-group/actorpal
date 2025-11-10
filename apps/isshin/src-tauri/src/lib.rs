mod features;

use features::app;
use features::hosts;
use features::process;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            process::commands::list_process,
            process::commands::max_running_process,
            process::commands::max_memory,
            process::commands::kill_process,
            app::commands::get_focused_application,
            #[cfg(target_os = "macos")]
            hosts::commands::block_websites,
            #[cfg(target_os = "macos")]
            hosts::commands::unblock_website,
            #[cfg(target_os = "macos")]
            hosts::commands::get_blocked_websites
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
