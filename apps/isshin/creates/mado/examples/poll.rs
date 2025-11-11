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
        match mado::get_active_app() {
            Ok(app) => {
                println!("📱 Current App");
                println!("   Name:       {}", app.name);
                println!("   PID:        {}", app.pid);
                println!("   Bundle ID:  {}", app.bundle_id);
                println!("   Path:       {}", app.process_path);
            }
            Err(e) => eprintln!("❌ Error getting app: {}", e),
        }

        match mado::get_active_window() {
            Ok(window) => {
                println!("\n🪟 Current Window");
                println!("   Title:      '{}'", window.title);
                println!("   Window ID:  {}", window.window_id);
                println!(
                    "   Bounds:     ({:.0}, {:.0})",
                    window.bounds.x, window.bounds.y
                );
                println!(
                    "   Size:       {:.0}x{:.0}",
                    window.bounds.width, window.bounds.height
                );

                println!("\n   App Info:");
                println!("      Name:       {}", window.app.name);
                println!("      PID:        {}", window.app.pid);
                println!("      Bundle ID:  {}", window.app.bundle_id);
                println!("      Path:       {}", window.app.process_path);

                if let Some(browser) = &window.browser {
                    println!("\n   Browser:");
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
            Err(e) => eprintln!("❌ Error getting window: {}", e),
        }

        println!("\n{}", "─".repeat(60));
        thread::sleep(Duration::from_secs(2));
    }
}
