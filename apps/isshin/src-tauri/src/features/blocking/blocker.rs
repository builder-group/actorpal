use crate::{
    app::window::ShowWindow,
    environment::{logger::Logger, states::blocking::BlockingState},
};
use mado::WindowEvent;
use tauri::{AppHandle, Manager};

fn is_app_blocked(bundle_id: &Option<String>, blocked_apps: &[String]) -> bool {
    if let Some(bundle_id) = bundle_id {
        return blocked_apps.contains(bundle_id);
    }
    false
}

fn handle_blocked_app(
    app: &AppHandle,
    bundle_id: &str,
    app_name: &str,
    bounds: Option<mado::WindowBounds>,
) {
    let msg = format!("[Blocker] 🚫 Blocked app: {} ({})", app_name, bundle_id);
    Logger::log(app, &msg);

    if let Err(e) = close_app(bundle_id, Some(app_name)) {
        let error_msg = format!("[Blocker] Failed to close app: {}", e);
        Logger::log(app, &error_msg);
    }

    // Show notification window
    let app_handle = app.clone();
    let notification_msg = format!("{} is blocked during focus time", app_name);
    tauri::async_runtime::spawn(async move {
        let (x, y, width, height) = if let Some(bounds) = bounds {
            (bounds.x, bounds.y, bounds.width, bounds.height)
        } else {
            // Fallback: center on screen
            (100.0, 100.0, 400.0, 200.0)
        };

        let _ = ShowWindow::BlockedNotification {
            message: notification_msg,
            x,
            y,
            width,
            height,
        }
        .show(&app_handle)
        .await;
    });
}

/// Handle window change event and block if necessary.
pub fn check_and_block_window(app: &AppHandle, event: &WindowEvent) {
    let blocking_state = match app.try_state::<BlockingState>() {
        Some(state) => state,
        None => return,
    };

    let blocking = blocking_state.lock().unwrap();
    if !blocking.is_active {
        return;
    }

    match event {
        WindowEvent::AppActivated { .. } => {
            // Don't block on AppActivated - wait for WindowChanged to get bounds
            // WindowChanged will fire shortly after with complete window information
        }
        WindowEvent::WindowChanged { window } => {
            // Check app blocking first (takes precedence over URL blocking)
            if is_app_blocked(&window.app.bundle_id, &blocking.blocked_apps) {
                let bundle_id = window.app.bundle_id.as_deref().unwrap_or("unknown");
                let app_name = window.app.name.as_deref().unwrap_or("Unknown");
                handle_blocked_app(app, bundle_id, app_name, window.bounds.clone());
                return;
            }

            // Check URL blocking (only for browser windows)
            if let Some(browser) = &window.browser {
                if let Some(url) = &browser.url {
                    if is_url_blocked(url, &blocking.blocked_sites) {
                        let bundle_id = window.app.bundle_id.as_deref().unwrap_or("unknown");
                        let msg = format!("[Blocker] 🚫 Blocked access to: {}", url);
                        Logger::log(app, &msg);

                        if let Err(e) = close_browser_window(bundle_id) {
                            let error_msg = format!("[Blocker] Failed to close window: {}", e);
                            Logger::log(app, &error_msg);
                        }

                        // Show notification window with same position and dimensions as blocked window
                        let app_handle = app.clone();
                        let notification_msg = format!("{} is blocked during focus time", url);
                        let bounds_clone = window.bounds.clone();
                        tauri::async_runtime::spawn(async move {
                            let (x, y, width, height) = if let Some(bounds) = bounds_clone {
                                // Use full bounds of blocked window
                                (bounds.x, bounds.y, bounds.width, bounds.height)
                            } else {
                                // Fallback: center on screen
                                (100.0, 100.0, 400.0, 200.0)
                            };

                            let _ = ShowWindow::BlockedNotification {
                                message: notification_msg,
                                x,
                                y,
                                width,
                                height,
                            }
                            .show(&app_handle)
                            .await;
                        });
                    }
                }
            }
        }
    }
}

/// Check if URL should be blocked.
/// Supports exact matches and subdomain matches (e.g., "facebook.com" matches "www.facebook.com").
fn is_url_blocked(url: &str, blocked_sites: &[String]) -> bool {
    if let Ok(parsed_url) = url::Url::parse(url) {
        if let Some(host) = parsed_url.host_str() {
            for blocked in blocked_sites {
                if host == blocked.as_str() || host.ends_with(&format!(".{}", blocked)) {
                    return true;
                }
            }
        }
    }
    false
}

#[cfg(target_os = "macos")]
fn close_browser_window(bundle_id: &str) -> Result<(), String> {
    use std::process::Command;

    // Map browser bundle IDs to AppleScript commands
    let script = match bundle_id {
        id if id.contains("com.google.Chrome") => {
            "tell application \"Google Chrome\" to close active tab of front window"
        }
        id if id.contains("com.microsoft.edgemac") => {
            "tell application \"Microsoft Edge\" to close active tab of front window"
        }
        id if id.contains("com.brave.Browser") => {
            "tell application \"Brave Browser\" to close active tab of front window"
        }
        id if id.contains("com.operasoftware.Opera") => {
            "tell application \"Opera\" to close active tab of front window"
        }
        id if id.contains("com.vivaldi.Vivaldi") => {
            "tell application \"Vivaldi\" to close active tab of front window"
        }
        id if id.contains("com.apple.Safari") => {
            "tell application \"Safari\" to close current tab of front window"
        }
        // Firefox requires keyboard shortcut workaround (no direct tab close API)
        id if id.contains("org.mozilla.firefox") => {
            "tell application \"Firefox\" to activate\n\
             tell application \"System Events\"\n\
             keystroke \"w\" using command down\n\
             end tell"
        }
        _ => {
            return Err(format!("Unsupported browser: {}", bundle_id));
        }
    };

    Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    return Ok(());
}

#[cfg(not(target_os = "macos"))]
fn close_browser_window(_bundle_id: &str) -> Result<(), String> {
    return Err("Blocking not yet supported on this platform".to_string());
}

/// Close application by bundle ID.
#[cfg(target_os = "macos")]
fn close_app(bundle_id: &str, app_name: Option<&str>) -> Result<(), String> {
    use std::process::Command;

    // Quit by app name
    if let Some(name) = app_name {
        let script = format!("tell application \"{}\" to quit", name);
        let output = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        if output.status.success() {
            return Ok(());
        }
    }

    return Err(format!("Failed to quit app: {}", bundle_id));
}

#[cfg(not(target_os = "macos"))]
fn close_app(_bundle_id: &str, _app_name: Option<&str>) -> Result<(), String> {
    return Err("App blocking not yet supported on this platform".to_string());
}
