use serde::Deserialize;
use specta::Type;
use std::str::FromStr;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

struct WindowConfig {
    label: &'static str,
    title: &'static str,
    url: &'static str,
    min_size: Option<(f64, f64)>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Type)]
pub enum Window {
    Main,
    Settings,
}

impl FromStr for Window {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        return match s {
            "main" => Ok(Window::Main),
            "settings" => Ok(Window::Settings),
            _ => Err(format!("Unknown window label: {s}")),
        };
    }
}

impl Window {
    fn config(&self) -> WindowConfig {
        return match self {
            Window::Main => WindowConfig {
                label: "main",
                title: "Isshin",
                url: "/",
                min_size: None,
            },
            Window::Settings => WindowConfig {
                label: "settings",
                title: "Isshin Settings",
                url: "/settings",
                min_size: Some((600.0, 450.0)),
            },
        };
    }

    pub fn get(&self, app: &AppHandle) -> Option<WebviewWindow> {
        return app.get_webview_window(self.config().label);
    }

    pub async fn show(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        if let Some(window) = self.get(app) {
            window.set_focus()?;
            return Ok(window);
        }

        return Ok(self.window_builder(app).build()?);
    }

    fn window_builder<'a>(
        &'a self,
        app: &'a AppHandle,
    ) -> WebviewWindowBuilder<'a, tauri::Wry, AppHandle> {
        let config = self.config();
        let mut builder =
            WebviewWindow::builder(app, config.label, WebviewUrl::App(config.url.into()))
                .title(config.title)
                .visible(false)
                .shadow(true);

        if let Some((width, height)) = config.min_size {
            builder = builder
                .inner_size(width, height)
                .min_inner_size(width, height);
        }

        match self {
            Window::Main => {
                builder = builder
                    .resizable(false)
                    .maximizable(false)
                    .minimizable(false)
                    .always_on_top(true)
                    .visible_on_all_workspaces(true);
            }
            Window::Settings => {
                builder = builder.resizable(true);
            }
        }

        return builder;
    }

    pub fn setup(&self, app: &AppHandle) {
        if let Some(window) = self.get(app) {
            return match self {
                Window::Main => {
                    // Setup close handler to hide instead of quit
                    let window_clone = window.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            let _ = window_clone.hide();
                        }
                    });
                }
                Window::Settings => {
                    // Setup close handler to hide instead of quit
                    let window_clone = window.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            let _ = window_clone.hide();
                        }
                    });
                }
            };
        }
    }
}
