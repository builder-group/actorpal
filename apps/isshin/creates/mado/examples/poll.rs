//! Example: Poll for current state on demand
//!
//! This example demonstrates explicit querying.
//! Call the query functions whenever you need the current state.

use std::thread;
use std::time::Duration;

fn main() -> Result<(), mado::Error> {
    println!("📊 Polling current state every 2 seconds...");
    println!("   Switch apps or windows to see changes");
    println!("   Press Ctrl+C to stop\n");

    // Check permissions
    if !mado::is_accessibility_trusted() {
        eprintln!("⚠️  Accessibility permissions required!");
        eprintln!("   Enable in: System Settings > Privacy & Security > Accessibility");
        return Err(mado::Error::MissingPermissions);
    }

    loop {
        // Query current app
        match mado::get_active_app() {
            Ok(app) => {
                println!("📱 Current App");
                println!("   Name:    {}", app.name);
                println!("   PID:     {}", app.pid);
                println!("   Bundle:  {}", app.bundle_id);
                println!("   Path:    {}", app.process_path);
            }
            Err(e) => eprintln!("❌ Error getting app: {}", e),
        }

        // Query current window
        match mado::get_active_window() {
            Ok(window) => {
                println!("\n🪟 Current Window");
                println!("   Title:   '{}'", window.title);
                println!("   ID:      {}", window.window_id);
                println!(
                    "   Bounds:  ({:.0},{:.0}) size {:.0}x{:.0}",
                    window.bounds.x, window.bounds.y, window.bounds.width, window.bounds.height
                );
            }
            Err(e) => eprintln!("❌ Error getting window: {}", e),
        }

        println!("\n{}", "─".repeat(60));
        thread::sleep(Duration::from_secs(2));
    }
}
