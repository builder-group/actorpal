use mado::WindowInfo;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri_specta::Event;

/// Core activity entry tracking window/app focus sessions
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEntry {
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

    // Time tracking
    pub start_time: u64,
    pub end_time: u64,
}

impl From<WindowInfo> for ActivityEntry {
    fn from(window: WindowInfo) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

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

        return Self {
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
            start_time: now,
            end_time: now,
        };
    }
}

impl ActivityEntry {
    /// Update end time to current time
    pub fn update_end_time(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        self.end_time = now;
    }

    /// Calculate duration in seconds from start and end time
    pub fn duration_seconds(&self) -> u64 {
        return self.end_time.saturating_sub(self.start_time);
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct ActiveWindowInfo {
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

impl From<WindowInfo> for ActiveWindowInfo {
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

        return Self {
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
        };
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct ActiveWindowChangedEvent {
    pub data: ActiveWindowInfo,
}
