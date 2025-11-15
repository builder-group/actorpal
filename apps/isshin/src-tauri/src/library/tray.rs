use std::io::Cursor;
use tauri::{
    menu::{Menu, MenuBuilder, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle,
};

use crate::environment::configs::app::AppConfig;
use crate::windows::Window;

struct TrayItemConfig {
    id: &'static str,
    label: &'static str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayItem {
    ShowDashboard,
    ShowSettings,
    Quit,
}

impl TrayItem {
    fn config(&self) -> TrayItemConfig {
        return match self {
            TrayItem::ShowDashboard => TrayItemConfig {
                id: "show_dashboard",
                label: "Show Dashboard",
            },
            TrayItem::ShowSettings => TrayItemConfig {
                id: "show_settings",
                label: "Show Settings",
            },
            TrayItem::Quit => TrayItemConfig {
                id: "quit",
                label: "Quit",
            },
        };
    }

    pub fn handle(&self, app: &AppHandle) {
        return match self {
            TrayItem::ShowDashboard => {
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = Window::Main.show(&app_handle).await;
                });
            }
            TrayItem::ShowSettings => {
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = Window::Settings.show(&app_handle).await;
                });
            }
            TrayItem::Quit => app.exit(0),
        };
    }
}

impl TryFrom<&str> for TrayItem {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        return match value {
            "show_dashboard" => Ok(TrayItem::ShowDashboard),
            "show_settings" => Ok(TrayItem::ShowSettings),
            "quit" => Ok(TrayItem::Quit),
            _ => Err(format!("unknown tray item id: {value}")),
        };
    }
}

pub struct Tray;

impl Tray {
    pub fn setup(app: &AppHandle) -> tauri::Result<TrayIcon<tauri::Wry>> {
        let menu = Self::setup_menu(app)?;
        let icon = Self::load_icon().unwrap_or_else(|e| panic!("Failed to load tray icon: {e}"));

        return TrayIconBuilder::new()
            .icon(icon)
            .menu(&menu)
            .show_menu_on_left_click(false)
            .tooltip(AppConfig::tray_tooltip())
            .on_menu_event(|app, event| Self::handle_menu_event(app, event.id().as_ref()))
            .build(app);
    }

    fn load_icon() -> Result<tauri::image::Image<'static>, String> {
        let icon_bytes = AppConfig::tray_icon_bytes();

        // Decode PNG to RGBA
        let decoder = png::Decoder::new(Cursor::new(icon_bytes));
        let mut reader = decoder
            .read_info()
            .map_err(|e| format!("Failed to decode PNG: {e}"))?;

        let buffer_size = reader.output_buffer_size().unwrap_or(0);
        let mut buf = vec![0u8; buffer_size];
        let info = reader
            .next_frame(&mut buf)
            .map_err(|e| format!("Failed to read PNG frame: {e}"))?;

        // Convert to RGBA if needed
        let rgba = match info.color_type {
            png::ColorType::Rgb => {
                let mut rgba_buf = Vec::with_capacity(buf.len() / 3 * 4);
                for chunk in buf.chunks_exact(3) {
                    rgba_buf.extend_from_slice(chunk);
                    rgba_buf.push(255); // Alpha
                }
                rgba_buf
            }
            png::ColorType::Rgba => buf,
            _ => return Err("Unsupported PNG color type".to_string()),
        };

        return Ok(tauri::image::Image::new_owned(
            rgba,
            info.width,
            info.height,
        ));
    }

    fn setup_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
        let show_dashboard = MenuItem::with_id(
            app,
            TrayItem::ShowDashboard.config().id,
            TrayItem::ShowDashboard.config().label,
            true,
            None::<&str>,
        )?;
        let show_settings = MenuItem::with_id(
            app,
            TrayItem::ShowSettings.config().id,
            TrayItem::ShowSettings.config().label,
            true,
            None::<&str>,
        )?;
        let quit = MenuItem::with_id(
            app,
            TrayItem::Quit.config().id,
            TrayItem::Quit.config().label,
            true,
            None::<&str>,
        )?;

        return MenuBuilder::new(app)
            .item(&show_dashboard)
            .item(&show_settings)
            .separator()
            .item(&quit)
            .build();
    }

    fn handle_menu_event(app: &AppHandle, event_id: &str) {
        if let Ok(item) = TrayItem::try_from(event_id) {
            item.handle(app);
        }
    }
}
