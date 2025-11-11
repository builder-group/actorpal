//! Window information gathering
//!
//! This module is a pure data aggregator that combines information from:
//! - workspace.rs (app information via NSWorkspace)
//! - accessibility.rs (window title and bounds via Accessibility API)
//! - cg_helpers.rs (window ID via CoreGraphics)
//!
//! It provides a simple, high-level interface for getting current app and window info.

use crate::types::{AppInfo, WindowInfo};

use super::accessibility;
use super::cg_helpers;
use super::workspace;

/// Get information about the current active application
pub fn get_current_app() -> Option<AppInfo> {
    let pid = workspace::get_current_pid()?;
    let name = workspace::get_app_name(pid)?;
    let bundle_id = workspace::get_bundle_id(pid).unwrap_or_default();
    let process_path = workspace::get_process_path(pid).unwrap_or_default();

    Some(AppInfo {
        pid,
        name,
        bundle_id,
        process_path,
    })
}

/// Get information about the current focused window
///
/// This aggregates data from multiple sources:
/// 1. NSWorkspace for app info
/// 2. Accessibility API for window title
/// 3. CoreGraphics for stable window ID and bounds
pub fn get_current_window() -> Option<WindowInfo> {
    let pid = workspace::get_current_pid()?;
    let app = get_current_app()?;

    let title = accessibility::get_window_title(pid).unwrap_or_default();

    // CoreGraphics provides more reliable window IDs and bounds than Accessibility API
    let (window_id, bounds) =
        cg_helpers::find_window_info(pid, &title).unwrap_or((0, Default::default()));

    Some(WindowInfo {
        title,
        window_id,
        bounds,
        app,
    })
}
