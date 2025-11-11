//! Browser-specific information gathering
//!
//! This module provides browser URL extraction using AppleScript on macOS.
//! Requires Automation permission: System Settings > Privacy & Security > Automation

use crate::config::MonitorConfig;
use crate::types::{BrowserInfo, WindowInfo};

/// Extend window info with browser data if applicable
///
/// This acts as middleware - called when a window change event fires.
/// If the app is a browser and `allow_browser` is enabled, fetches the URL.
pub fn extend_window_info(window: &mut WindowInfo, config: MonitorConfig) {
    if !config.allow_browser {
        return;
    }

    if !is_browser(&window.app.bundle_id) {
        return;
    }

    if let Some(url) = get_browser_url(&window.app.bundle_id) {
        window.browser = Some(BrowserInfo { url: Some(url) });
    }
}

/// Check if a bundle ID belongs to a browser
fn is_browser(bundle_id: &str) -> bool {
    let bid_lower = bundle_id.to_lowercase();
    return bid_lower.contains("chrome")
        || bid_lower.contains("safari")
        || bid_lower.contains("firefox")
        || bid_lower.contains("edge")
        || bid_lower.contains("brave")
        || bid_lower.contains("opera")
        || bid_lower.contains("arc")
        || bid_lower.contains("browser");
}

/// Get the current URL from a browser using AppleScript
///
/// Requires Automation permission for the browser in:
/// System Settings > Privacy & Security > Automation
///
/// Returns None if:
/// - Not a browser
/// - Automation permission not granted
/// - No active tab/window
/// - AppleScript execution fails
fn get_browser_url(bundle_id: &str) -> Option<String> {
    use std::process::Command;

    // Firefox doesn't support AppleScript well
    let bid_lower = bundle_id.to_lowercase();
    if bid_lower.contains("firefox") {
        return None;
    }

    // AppleScript to get active tab URL
    let script = format!(
        r#"
        tell application id "{}"
            if (count of windows) > 0 then
                set activeTab to active tab of front window
                return URL of activeTab
            end if
        end tell
        "#,
        bundle_id
    );

    match Command::new("osascript").arg("-e").arg(&script).output() {
        Ok(output) => {
            if output.status.success() {
                let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !url.is_empty() && (url.starts_with("http://") || url.starts_with("https://")) {
                    return Some(url);
                }
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                if error.contains("not allowed") || error.contains("denied") {
                    // Automation permission not granted - silently fail
                    // User can enable in System Settings if they want this feature
                }
            }
        }
        Err(_) => {
            // osascript not available or execution failed - silently fail
        }
    }

    return None;
}
