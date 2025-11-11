//! macOS-specific types

/// Window bounds
#[derive(Debug, Clone, Copy)]
pub struct WindowBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Extended window info for macOS
#[derive(Debug, Clone)]
pub struct WindowInfo {
    pub title: String,
    pub window_id: u32,
    pub bounds: WindowBounds,
}
