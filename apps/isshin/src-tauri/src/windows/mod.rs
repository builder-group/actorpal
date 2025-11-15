use serde::Deserialize;
use specta::Type;
use std::str::FromStr;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

mod main;
mod settings;

use main::MainWindow;
use settings::SettingsWindow;

pub struct WindowConfig {
    pub label: &'static str,
    pub title: &'static str,
    pub url: &'static str,
    pub min_size: Option<(f64, f64)>,
    pub resizable: bool,
    pub maximizable: bool,
    pub minimizable: bool,
    pub always_on_top: bool,
    pub visible_on_all_workspaces: bool,
}

pub trait WindowInstance {
    fn config(&self) -> WindowConfig;
    fn setup(&self, window: &WebviewWindow);
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
    fn instance(&self) -> Box<dyn WindowInstance> {
        return match self {
            Window::Main => Box::new(MainWindow),
            Window::Settings => Box::new(SettingsWindow),
        };
    }

    pub fn get(&self, app: &AppHandle) -> Option<WebviewWindow> {
        let instance = self.instance();
        let config = instance.config();
        return app.get_webview_window(config.label);
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
        let instance = self.instance();
        let config = instance.config();
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

        builder = builder
            .resizable(config.resizable)
            .maximizable(config.maximizable)
            .minimizable(config.minimizable)
            .always_on_top(config.always_on_top)
            .visible_on_all_workspaces(config.visible_on_all_workspaces);

        return builder;
    }

    pub fn setup(&self, app: &AppHandle) {
        if let Some(window) = self.get(app) {
            let instance = self.instance();
            instance.setup(&window);
        }
    }
}
