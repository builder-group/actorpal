use crate::windows::{WindowConfig, WindowInstance};
use tauri::WebviewWindow;

pub struct MainWindow;

impl WindowInstance for MainWindow {
    fn config(&self) -> WindowConfig {
        return WindowConfig {
            label: "main",
            title: "Isshin",
            url: "/",
            min_size: None,
            resizable: false,
            maximizable: false,
            minimizable: false,
            always_on_top: true,
            visible_on_all_workspaces: true,
        };
    }

    fn setup(&self, window: &WebviewWindow) {
        // Setup close handler to hide instead of quit
        let window_clone = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window_clone.hide();
            }
        });
    }
}
