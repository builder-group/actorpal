//! Browser-specific information gathering
//!
//! This module provides browser URL extraction using AppleScript on macOS.
//! Requires Automation permission: System Settings > Privacy & Security > Automation

use crate::config::MonitorConfig;
use crate::types::{BrowserInfo, WindowInfo};

/// Extend window info with browser data if applicable
///
/// This acts as middleware - called when a window change event fires.
/// If the app is a browser and `allow_browser` is enabled, fetches the URL and private mode status.
pub fn extend_window_info(window: &mut WindowInfo, config: MonitorConfig) {
    if !config.allow_browser {
        return;
    }

    if !is_browser(&window.app.bundle_id) {
        return;
    }

    let url = get_browser_url(&window.app.bundle_id);
    let is_private = detect_private_mode(&window.app.bundle_id, &window.title);

    // Only create BrowserInfo if we have at least URL or private mode detection
    if url.is_some() || is_private.is_some() {
        window.browser = Some(BrowserInfo { url, is_private });
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

/// Detect if browser is in private/incognito mode
///
/// For Chrome-based browsers, uses the window `mode` property via AppleScript.
/// Falls back to title parsing for other browsers or if AppleScript fails.
///
/// Returns:
/// - `Some(true)` if private mode is detected
/// - `Some(false)` if private mode is confirmed not active (Chrome-based browsers)
/// - `None` if detection failed or not supported
fn detect_private_mode(bundle_id: &str, window_title: &str) -> Option<bool> {
    // Try AppleScript detection for Chrome-based browsers (has window.mode property)
    if let Some(is_private) = detect_private_via_applescript(bundle_id) {
        return Some(is_private);
    }

    // Fallback: Check title for common private mode indicators
    return detect_private_via_title(window_title);
}

/// Detect private mode via AppleScript (Chrome-based browsers)
///
/// Chrome-based browsers (Chrome, Brave, Edge, etc.) expose a `mode` property
/// on windows that can be "incognito" or "normal".
fn detect_private_via_applescript(bundle_id: &str) -> Option<bool> {
    use std::process::Command;

    let bid_lower = bundle_id.to_lowercase();

    // Chrome-based browsers support the mode property
    // Safari doesn't have this property, so skip it
    if bid_lower.contains("safari") || bid_lower.contains("firefox") {
        return None;
    }

    // AppleScript to check window mode property
    let script = format!(
        r#"
        tell application id "{}"
            if (count of windows) > 0 then
                set windowMode to mode of front window
                if windowMode is "incognito" then
                    return "true"
                else
                    return "false"
                end if
            end if
        end tell
        "#,
        bundle_id
    );

    match Command::new("osascript").arg("-e").arg(&script).output() {
        Ok(output) => {
            if output.status.success() {
                let result_str = String::from_utf8_lossy(&output.stdout);
                let result = result_str.trim();
                if result == "true" {
                    return Some(true);
                } else if result == "false" {
                    return Some(false);
                }
            }
        }
        Err(_) => {
            // osascript not available or execution failed - silently fail
        }
    }

    return None;
}

/// Detect private mode by parsing window title
///
/// Fallback method for browsers that don't expose mode via AppleScript
/// or when AppleScript detection fails.
fn detect_private_via_title(title: &str) -> Option<bool> {
    let title_lower = title.to_lowercase();

    // Check for "(Private)" or "(Incognito)" at the end (Brave, Chrome)
    if title_lower.ends_with("(private)") || title_lower.ends_with("(incognito)") {
        return Some(true);
    }

    // Check for ", Private Browsing" at the end (Safari format: "Page Title, Private Browsing")
    if title_lower.ends_with(", private browsing") {
        return Some(true);
    }

    // If we can't detect it, return None (unknown)
    return None;
}
