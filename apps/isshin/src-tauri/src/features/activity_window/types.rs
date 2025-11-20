use mado::{AppInfo, WindowInfo};
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::Event;

#[derive(Debug, Clone)]
pub struct App {
    pub id: i64,
    pub bundle_id: Option<String>,
    pub name: Option<String>,
    pub process_path: Option<String>,
    pub first_seen_at: i64,
    pub last_seen_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppActivity {
    pub id: i64,
    pub app_id: i64,
    pub start_time: i64,
    pub end_time: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppInfoDto {
    pub application: String,
    pub bundle_id: Option<String>,
    pub pid: Option<i32>,
    pub process_path: Option<String>,
}

impl From<AppInfo> for AppInfoDto {
    fn from(app: AppInfo) -> Self {
        let bundle_id = if app.bundle_id.is_empty() {
            None
        } else {
            Some(app.bundle_id)
        };

        let process_path = if app.process_path.is_empty() {
            None
        } else {
            Some(app.process_path)
        };

        Self {
            application: app.name,
            bundle_id,
            pid: Some(app.pid),
            process_path,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WindowActivity {
    pub id: i64,
    pub app_id: i64,
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
    pub start_time: i64,
    pub end_time: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfoDto {
    // App information
    pub application: String,
    pub bundle_id: Option<String>,
    pub pid: Option<i32>,
    pub process_path: Option<String>,

    // Window information
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,

    // Browser information (if applicable)
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
}

impl From<WindowInfo> for WindowInfoDto {
    fn from(window: WindowInfo) -> Self {
        let bundle_id = if window.app.bundle_id.is_empty() {
            None
        } else {
            Some(window.app.bundle_id)
        };

        let process_path = if window.app.process_path.is_empty() {
            None
        } else {
            Some(window.app.process_path)
        };

        let browser_url = window.browser.as_ref().and_then(|b| b.url.clone());
        let browser_is_private = window.browser.as_ref().and_then(|b| b.is_private);

        Self {
            application: window.app.name,
            bundle_id,
            pid: Some(window.app.pid),
            process_path,
            window_title: Some(window.title),
            window_id: Some(window.window_id),
            window_x: Some(window.bounds.x),
            window_y: Some(window.bounds.y),
            window_width: Some(window.bounds.width),
            window_height: Some(window.bounds.height),
            browser_url,
            browser_is_private,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct ActiveAppChangedEvent {
    pub data: AppInfoDto,
}

#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct ActiveWindowChangedEvent {
    pub data: WindowInfoDto,
}
