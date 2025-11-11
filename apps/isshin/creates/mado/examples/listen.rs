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
            println!("   App:     {}", window.app.name);
            println!("   PID:     {}", window.app.pid);
            println!("   Bundle:  {}", window.app.bundle_id);
            println!("   Window:  '{}'", window.title);
            println!(
                "   Size:    {:.0}x{:.0}",
                window.bounds.width, window.bounds.height
            );
            *last_bundle = Some(window.app.bundle_id.clone());
        } else {
            println!("\n🪟 Window Change");
            println!("   Title:   '{}'", window.title);
            println!("   ID:      {}", window.window_id);
            println!("   App:     {}", window.app.name);
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
    let monitor = Monitor::new(FocusListener::new());
    monitor.run()
}
