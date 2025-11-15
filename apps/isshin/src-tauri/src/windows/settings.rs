use crate::windows::{WindowConfig, WindowInstance};
use tauri::WebviewWindow;

pub struct SettingsWindow;

impl WindowInstance for SettingsWindow {
    fn config(&self) -> WindowConfig {
        return WindowConfig {
            label: "settings",
            title: "Isshin Settings",
            url: "/settings",
            min_size: Some((600.0, 450.0)),
            resizable: true,
            maximizable: true,
            minimizable: true,
            always_on_top: false,
            visible_on_all_workspaces: false,
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
