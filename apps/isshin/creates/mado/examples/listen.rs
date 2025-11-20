//! Example: Listen to focus changes in real-time
//!
//! This example demonstrates event-driven monitoring.
//! The monitor runs continuously and calls your handler whenever:
//! - The user switches to a different app (AppActivated event)
//! - The focused window changes (WindowChanged event)
//! - A browser tab switches (WindowChanged event)

use mado::{WindowEvent, WindowListener, WindowMonitor};

struct FocusListener;

impl WindowListener for FocusListener {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app } => {
                println!("\n🔄 App Activated");
                println!("   App:");
                println!("      Name:       {:?}", app.name);
                println!("      PID:        {}", app.pid);
                println!("      Bundle ID:  {:?}", app.bundle_id);
                println!("      Path:       {:?}", app.process_path);
                println!("   Note: Window information may follow in WindowChanged event");
            }
            WindowEvent::WindowChanged { window } => {
                // WindowChanged events are for window/title changes within the same app
                // App changes are always signaled via AppActivated events
                println!("\n🪟 Window Change");

                println!("   Window:");
                println!("      Title:      {:?}", window.title);
                println!("      Window ID:  {:?}", window.window_id);
                println!(
                    "      Bounds:     ({:.0}, {:.0})",
                    window.bounds.unwrap_or_default().x,
                    window.bounds.unwrap_or_default().y
                );
                println!(
                    "      Size:       {:.0}x{:.0}",
                    window.bounds.unwrap_or_default().width,
                    window.bounds.unwrap_or_default().height
                );

                println!("   App:");
                println!("      Name:       {:?}", window.app.name);
                println!("      PID:        {}", window.app.pid);
                println!("      Bundle ID:  {:?}", window.app.bundle_id);
                println!("      Path:       {:?}", window.app.process_path);

                if let Some(browser) = &window.browser {
                    println!("   Browser:");
                    if let Some(url) = &browser.url {
                        println!("      URL:        {}", url);
                    } else {
                        println!(
                            "      URL:        (not available - may need Automation permission)"
                        );
                    }
                    if let Some(is_private) = browser.is_private {
                        if is_private {
                            println!("      Mode:       Private/Incognito");
                        }
                    }
                }
            }
        }
    }
}

fn main() -> Result<(), mado::Error> {
    println!("🎧 Listening for focus changes...");
    println!("   Switch apps or windows to see events");
    println!("   Press Ctrl+C to stop\n");

    // Check permissions
    if !mado::is_accessibility_trusted() {
        eprintln!("⚠️  Accessibility permissions required for window change tracking!");
        eprintln!("   Enable in: System Settings > Privacy & Security > Accessibility");
        eprintln!("   Or set track_window_changes: false to only track app switches");
        return Err(mado::Error::MissingPermissions);
    }

    // Start listening (blocks until stopped)
    let config = mado::MonitorConfig {
        allow_browser: true,
        track_window_changes: true,
    };
    let monitor = WindowMonitor::with_config(FocusListener, config);
    monitor.run()
}
