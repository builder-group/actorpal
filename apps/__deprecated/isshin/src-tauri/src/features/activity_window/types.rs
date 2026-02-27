use mado::{AppInfo, BrowserInfo, WindowBounds, WindowInfo};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct App {
    pub id: i64,
    pub bundle_id: Option<String>,
    pub name: Option<String>,
    pub process_path: Option<String>,
    pub first_seen_at: i64,
    pub last_seen_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppActivity {
    pub id: i64,
    pub app_id: i64,
    pub start_time: i64,
    pub end_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WindowActivity {
    pub id: i64,
    pub app_id: i64,
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_bounds: Option<WindowBounds>,
    pub browser: Option<BrowserInfo>,
    pub start_time: i64,
    pub end_time: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct ActiveAppChangedEvent {
    pub data: AppInfo,
}

#[derive(Serialize, Deserialize, Debug, Clone, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct ActiveWindowChangedEvent {
    pub data: WindowInfo,
}
