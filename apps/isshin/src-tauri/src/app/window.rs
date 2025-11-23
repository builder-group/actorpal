use serde::Deserialize;
use specta::Type;
use std::str::FromStr;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// Window identifier for getting existing windows and metadata.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Type)]
pub enum WindowId {
    Main,
    Settings,
    BlockedNotification,
}

/// Window creation request with parameters.
#[derive(Debug, Clone)]
pub enum ShowWindow {
    Main,
    Settings,
    BlockedNotification {
        message: String,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    },
}

impl FromStr for WindowId {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        return match s {
            "main" => Ok(WindowId::Main),
            "settings" => Ok(WindowId::Settings),
            "blocked-notification" => Ok(WindowId::BlockedNotification),
            _ => Err(format!("Unknown window label: {s}")),
        };
    }
}

impl std::fmt::Display for WindowId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WindowId::Main => write!(f, "main"),
            WindowId::Settings => write!(f, "settings"),
            WindowId::BlockedNotification => write!(f, "blocked-notification"),
        }
    }
}

impl WindowId {
    pub fn label(&self) -> String {
        self.to_string()
    }

    pub fn title(&self) -> String {
        match self {
            WindowId::Main => "Isshin".to_string(),
            WindowId::Settings => "Isshin - Settings".to_string(),
            WindowId::BlockedNotification => "Blocked".to_string(),
        }
    }

    pub fn min_size(&self) -> Option<(f64, f64)> {
        match self {
            WindowId::Main => None,
            WindowId::Settings => Some((600.0, 450.0)),
            WindowId::BlockedNotification => None,
        }
    }

    pub fn get(&self, app: &AppHandle) -> Option<WebviewWindow> {
        app.get_webview_window(&self.label())
    }
}

impl ShowWindow {
    pub fn id(&self) -> WindowId {
        return match self {
            ShowWindow::Main => WindowId::Main,
            ShowWindow::Settings => WindowId::Settings,
            ShowWindow::BlockedNotification { .. } => WindowId::BlockedNotification,
        };
    }

    pub async fn show(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let id = self.id();

        // Check if window already exists
        if let Some(window) = id.get(app) {
            window.show()?;
            window.set_focus()?;
            return Ok(window);
        }

        // Build window based on variant
        let window = match self {
            ShowWindow::Main => self
                .window_builder(app, WebviewUrl::App("/".into()))
                .resizable(false)
                .maximizable(false)
                .minimizable(false)
                .always_on_top(true)
                .visible_on_all_workspaces(true)
                .build()?,
            ShowWindow::Settings => self
                .window_builder(app, WebviewUrl::App("/settings".into()))
                .resizable(true)
                .maximizable(true)
                .minimizable(true)
                .inner_size(600.0, 450.0)
                .min_inner_size(600.0, 450.0)
                .build()?,
            ShowWindow::BlockedNotification {
                message,
                x,
                y,
                width,
                height,
            } => {
                // Close existing notification if any
                if let Some(existing) = WindowId::BlockedNotification.get(app) {
                    let _ = existing.close();
                }

                let encoded_message =
                    url::form_urlencoded::byte_serialize(message.as_bytes()).collect::<String>();
                let url = format!("/blocked?message={}", encoded_message);
                self.window_builder(app, WebviewUrl::App(url.into()))
                    .resizable(false)
                    .maximizable(false)
                    .minimizable(false)
                    .always_on_top(true)
                    .visible_on_all_workspaces(true)
                    .inner_size(*width, *height)
                    .min_inner_size(*width, *height)
                    .position(*x, *y)
                    .build()?
            }
        };

        window.show()?;
        window.set_focus()?;
        return Ok(window);
    }

    fn window_builder<'a>(
        &'a self,
        app: &'a AppHandle,
        url: WebviewUrl,
    ) -> WebviewWindowBuilder<'a, tauri::Wry, AppHandle> {
        let id = self.id();

        let mut builder = WebviewWindow::builder(app, id.label(), url)
            .title(id.title())
            .visible(false)
            .shadow(true);

        if let Some((width, height)) = id.min_size() {
            builder = builder
                .inner_size(width, height)
                .min_inner_size(width, height);
        }

        return builder;
    }
}
