use crate::types::{BrowserInfo, WindowInfo};
use std::process::Command;

/// Extend window info with browser data (URL, private mode) if applicable.
///
/// Uses AppleScript to extract browser URLs and private mode.
/// Requires Automation permission: System Settings > Privacy & Security > Automation
pub fn extend_window_info(window: &mut WindowInfo) {
    let bundle_id = match &window.app.bundle_id {
        Some(bundle_id) => bundle_id,
        None => return,
    };
    if !is_browser(&bundle_id) {
        return;
    }

    let url = get_browser_url(&bundle_id);
    let is_private = detect_private_mode(&bundle_id, window.title.as_deref().unwrap_or(""));
    if url.is_some() || is_private.is_some() {
        window.browser = Some(BrowserInfo { url, is_private });
    }
}

fn is_browser(bundle_id: &str) -> bool {
    const BROWSER_KEYWORDS: &[&str] = &[
        "chrome", "safari", "firefox", "edge", "brave", "opera", "arc", "browser",
    ];

    let bid_lower = bundle_id.to_lowercase();
    return BROWSER_KEYWORDS
        .iter()
        .any(|keyword| bid_lower.contains(keyword));
}

/// Get current URL from browser via AppleScript.
///
/// Not all browsers (e.g. Firefox) support getting the active tab URL.
/// Returns None if the browser doesn't support it or if execution fails.
fn get_browser_url(bundle_id: &str) -> Option<String> {
    let bid_lower = bundle_id.to_lowercase();
    if bid_lower.contains("firefox") {
        return None;
    }

    // Get active tab URL from browser via AppleScript
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
    let output = match Command::new("osascript").arg("-e").arg(&script).output() {
        Ok(output) => output,
        Err(_) => return None,
    };
    if !output.status.success() {
        return None;
    }

    // Parse and validate URL
    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if url.is_empty() || (!url.starts_with("http://") && !url.starts_with("https://")) {
        return None;
    }

    return Some(url);
}

/// Detect private/incognito mode.
fn detect_private_mode(bundle_id: &str, window_title: &str) -> Option<bool> {
    // Try AppleScript first
    if let Some(is_private) = detect_private_via_applescript(bundle_id) {
        return Some(is_private);
    }

    // Fallback to title parsing if AppleScript fails
    return detect_private_via_title(window_title);
}

/// Detect private mode via AppleScript.
///
/// Not all browsers (e.g. Firefox) support getting the window mode.
/// Returns None if the browser doesn't support it or if execution fails.
fn detect_private_via_applescript(bundle_id: &str) -> Option<bool> {
    // Check window mode via AppleScript
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
    let output = match Command::new("osascript").arg("-e").arg(&script).output() {
        Ok(output) => output,
        Err(_) => return None,
    };
    if !output.status.success() {
        return None;
    }

    // Parse result
    let result_str = String::from_utf8_lossy(&output.stdout);
    let result = result_str.trim();
    if result == "true" {
        return Some(true);
    }
    if result == "false" {
        return Some(false);
    }

    return None;
}

/// Detect private mode via title parsing.
///
/// Checks for browser-specific private mode indicators in window titles:
/// - Chrome: "... (private)" or "... (incognito)"
/// - Safari: "..., private browsing"
fn detect_private_via_title(title: &str) -> Option<bool> {
    let title_lower = title.to_lowercase();
    if title_lower.ends_with("(incognito)")
        || title_lower.ends_with("(private)")
        || title_lower.ends_with(", private browsing")
    {
        return Some(true);
    }
    return None;
}
