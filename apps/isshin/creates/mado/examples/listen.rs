//! Example: Listen to focus changes in real-time
//!
//! This example demonstrates event-driven monitoring.
//! The monitor runs continuously and calls your handler whenever:
//! - The user switches to a different app
//! - The focused window changes
//! - A browser tab switches

use mado::{EventHandler, Monitor, WindowInfo};

struct FocusListener {
    last_bundle_id: std::sync::Mutex<Option<String>>,
}

impl FocusListener {
    fn new() -> Self {
        Self {
            last_bundle_id: std::sync::Mutex::new(None),
        }
    }
}

impl EventHandler for FocusListener {
    fn on_focus_change(&self, window: WindowInfo) {
        let mut last_bundle = self.last_bundle_id.lock().unwrap();
        let app_changed = last_bundle.as_deref() != Some(&window.app.bundle_id);

        if app_changed {
            println!("\n🔄 App Switch");
            *last_bundle = Some(window.app.bundle_id.clone());
        } else {
            println!("\n🪟 Window Change");
        }

        println!("   Window:");
        println!("      Title:      '{}'", window.title);
        println!("      Window ID:  {}", window.window_id);
        println!(
            "      Bounds:     ({:.0}, {:.0})",
            window.bounds.x, window.bounds.y
        );
        println!(
            "      Size:       {:.0}x{:.0}",
            window.bounds.width, window.bounds.height
        );

        println!("   App:");
        println!("      Name:       {}", window.app.name);
        println!("      PID:        {}", window.app.pid);
        println!("      Bundle ID:  {}", window.app.bundle_id);
        println!("      Path:       {}", window.app.process_path);

        if let Some(browser) = &window.browser {
            println!("   Browser:");
            if let Some(url) = &browser.url {
                println!("      URL:        {}", url);
            } else {
                println!("      URL:        (not available - may need Automation permission)");
            }
            if let Some(is_private) = browser.is_private {
                if is_private {
                    println!("      Mode:       Private/Incognito");
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
        eprintln!("⚠️  Accessibility permissions required!");
        eprintln!("   Enable in: System Settings > Privacy & Security > Accessibility");
        return Err(mado::Error::MissingPermissions);
    }

    // Start listening (blocks until stopped)
    // Enable browser URL extraction (requires Automation permission on macOS)
    let config = mado::MonitorConfig {
        allow_browser: true,
    };
    let monitor = Monitor::with_config(FocusListener::new(), config);
    monitor.run()
}
