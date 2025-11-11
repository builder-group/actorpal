//! Core types for window and app information

/// Information about an application
#[derive(Debug, Clone)]
pub struct AppInfo {
    pub pid: i32,
    pub name: String,
    pub bundle_id: String,
    pub process_path: String,
}

/// Information about a window
#[derive(Debug, Clone)]
pub struct WindowInfo {
    pub title: String,
    pub window_id: u32,
    pub bounds: WindowBounds,
    pub app: AppInfo,
}

/// Window bounds (position and size)
#[derive(Debug, Clone, Copy, Default)]
pub struct WindowBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}
