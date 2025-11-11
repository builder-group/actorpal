# mado (窓)

> A simple, clean window monitoring library for Rust

## Features

- 🪟 **Query current state** - Get active app/window information on demand
- 📡 **Monitor changes** - Listen to app switches and window changes in real-time
- 📑 **Tab switch detection** - Detects browser tab switches (macOS & Linux)
- 🌐 **Browser URL extraction** - Get current browser tab URL (macOS only, optional)
- 🎯 **Simple API** - Query functions + event listeners
- 🧩 **Clean architecture** - KISS principle throughout
- 🚀 **Cross-platform** - macOS and Linux support

## Platform Support

- ✅ **macOS**: Full support (NSWorkspace + Accessibility API)
- ✅ **Linux**: Full support (X11)
- 🚧 **Windows**: Planned

### Requirements

**macOS:**
- macOS 10.9+
- **Accessibility permissions** required (System Settings > Privacy & Security > Accessibility)
- **Automation permissions** (optional, for browser URL extraction): System Settings > Privacy & Security > Automation

**Linux:**
- X11 display server
- X11 development libraries (`libx11-dev` on Debian/Ubuntu, `libX11-devel` on Fedora)

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
mado = "0.1.0"
```

## 📖 Usage

### Query current state

Get information about the currently focused app or window:

```rust
use mado;

fn main() -> Result<(), mado::Error> {
    // Get current active app
    let app = mado::get_active_app()?;
    println!("Current app: {} (PID: {})", app.name, app.pid);

    // Get current active window (includes app info)
    let window = mado::get_active_window()?;
    println!("Window: '{}'", window.title);
    println!("  App: {}", window.app.name);
    println!("  Position: ({:.0}, {:.0})", window.bounds.x, window.bounds.y);
    println!("  Size: {:.0}x{:.0}", window.bounds.width, window.bounds.height);

    Ok(())
}
```

See `examples/poll.rs` for a complete example.

### Listen to changes

React to focus changes in real-time:

```rust
use mado::{EventHandler, Monitor, WindowInfo};
use std::sync::Mutex;

struct FocusListener {
    last_bundle_id: Mutex<Option<String>>,
}

impl FocusListener {
    fn new() -> Self {
        Self {
            last_bundle_id: Mutex::new(None),
        }
    }
}

impl EventHandler for FocusListener {
    fn on_focus_change(&self, window: WindowInfo) {
        let mut last_bundle = self.last_bundle_id.lock().unwrap();
        let app_changed = last_bundle.as_deref() != Some(&window.app.bundle_id);
        
        if app_changed {
            println!("🔄 App Switch: {}", window.app.name);
            *last_bundle = Some(window.app.bundle_id.clone());
        } else {
            println!("🪟 Window Change: '{}'", window.title);
        }
    }
}

fn main() -> Result<(), mado::Error> {
    let monitor = Monitor::new(FocusListener::new());
    monitor.run() // Blocks until stopped
}
```

See `examples/listen.rs` for a complete example.

### Browser URL extraction (macOS only)

Enable browser URL extraction to get the current tab URL from browser windows:

```rust
use mado::{EventHandler, Monitor, MonitorConfig, WindowInfo};

struct MyHandler;

impl EventHandler for MyHandler {
    fn on_focus_change(&self, window: WindowInfo) {
        println!("Window: {}", window.title);
        
        // Check if browser info is available
        if let Some(browser) = &window.browser {
            if let Some(url) = &browser.url {
                println!("  URL: {}", url);
            }
            
            // Check if in private mode
            if let Some(is_private) = browser.is_private {
                if is_private {
                    println!("  Mode: Private/Incognito");
                }
            }
        }
    }
}

fn main() -> Result<(), mado::Error> {
    // Enable browser URL extraction
    let config = MonitorConfig {
        allow_browser: true, // Requires Automation permission on macOS
    };
    
    let monitor = Monitor::with_config(MyHandler, config);
    monitor.run()
}
```

**Note:** Browser URL extraction requires Automation permission on macOS. If not granted, `window.browser` will be `None`. This feature is disabled by default to avoid requiring additional permissions.

### Stop monitoring from another thread

```rust
use mado::Monitor;
use std::thread;
use std::time::Duration;

fn main() -> Result<(), mado::Error> {
    let monitor = Monitor::new(MyHandler);
    
    // Stop after 5 seconds
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(5));
        Monitor::stop().unwrap();
    });
    
    monitor.run() // Blocks until stop() is called
}
```

### Check permissions (macOS)

```rust
if !mado::is_accessibility_trusted() {
    eprintln!("Please grant accessibility permissions in System Settings");
    return;
}
```

## 📚 API Reference

### Types

#### `AppInfo`

Application information:

```rust
pub struct AppInfo {
    pub pid: i32,              // Process ID
    pub name: String,          // App name (e.g., "Brave Browser")
    pub bundle_id: String,     // Bundle ID (macOS) or app name (Linux)
    pub process_path: String,  // Full path to executable (macOS only)
}
```

#### `WindowInfo`

Window information (includes app info):

```rust
pub struct WindowInfo {
    pub title: String,         // Window title
    pub window_id: u32,        // Unique window ID
    pub bounds: WindowBounds,  // Position and size (macOS only)
    pub app: AppInfo,          // Associated app info
    pub browser: Option<BrowserInfo>, // Browser info (if allow_browser is enabled)
}
```

#### `BrowserInfo`

Browser-specific information (macOS only, optional):

```rust
pub struct BrowserInfo {
    pub url: Option<String>, // Current URL of the active tab
    pub is_private: Option<bool>, // Whether window is in private/incognito mode
}
```

**Note:** `BrowserInfo` is only populated when:
- `allow_browser` is enabled in `MonitorConfig`
- The window belongs to a supported browser
- Automation permission is granted (macOS)

#### `WindowBounds`

Window position and size:

```rust
pub struct WindowBounds {
    pub x: f64,      // X coordinate
    pub y: f64,      // Y coordinate
    pub width: f64,  // Window width
    pub height: f64, // Window height
}
```

**Note:** On Linux, `bounds` is always `(0, 0, 0, 0)` as X11 property queries don't provide window geometry.

### Functions

- `get_active_app() -> Result<AppInfo, Error>` - Get current active application
- `get_active_window() -> Result<WindowInfo, Error>` - Get current active window
- `is_accessibility_trusted() -> bool` - Check if accessibility permissions are granted (macOS only)

### `Monitor`

- `Monitor::new(handler: H) -> Monitor` - Create monitor with default config
- `Monitor::with_config(handler: H, config: MonitorConfig) -> Monitor` - Create monitor with custom config
- `monitor.run() -> Result<(), Error>` - Start monitoring (blocks until stopped)
- `Monitor::stop() -> Result<(), Error>` - Stop monitoring (can be called from any thread)

### `MonitorConfig`

Configuration for the window monitor:

```rust
pub struct MonitorConfig {
    pub allow_browser: bool, // Enable browser URL extraction (macOS only, default: false)
}
```

**Default:** All features disabled (minimal overhead, no additional permissions required)

### `EventHandler` Trait

```rust
pub trait EventHandler: Send + Sync {
    fn on_focus_change(&self, window: WindowInfo);
}
```

The callback receives complete window information including app details. You can detect app switches by tracking `window.app.bundle_id`.

## 📐 Architecture

### Why Event-Driven?

**Problem**: Polling for window changes is inefficient and adds latency.

**Solution**: Event-driven monitoring provides:
- **Low latency**: Immediate notifications when changes occur
- **Low CPU usage**: No polling loops consuming resources
- **Battery friendly**: System wakes the process only when needed

### Platform Implementation

#### macOS: Two-Layer Monitoring

We use two monitoring layers internally, but expose a unified callback:

**1. App Switching** (`NSWorkspace`)
- Monitors `NSWorkspaceDidActivateApplicationNotification`
- Fires when user switches to a different app (infrequent)
- Creates Accessibility observer for the new app
- Sends `on_focus_change()` when window info is ready

**2. Window Changes** (Accessibility API)
- Monitors `kAXFocusedWindowChangedNotification` and `kAXTitleChangedNotification`
- Fires on window focus changes OR title changes (frequent)
- Detects tab switches via title changes
- Requires accessibility permissions
- Sends `on_focus_change()` for all window/title changes

**Why unified callback?** The library doesn't distinguish between app and window changes - that's a consumer concern. This simplifies the API (no state tracking), gives consumers full control, and makes it easier to extend with additional data (URLs, metadata) later.

**Information Gathering:**
- **NSWorkspace**: App metadata (name, bundle ID, path)
- **Accessibility API**: Window title
- **CoreGraphics**: Window ID and bounds

**Architecture:**
- Uses `objc2` crate for Objective-C interop
- `WorkspaceMonitor` manages `WorkspaceDelegate` (Objective-C delegate)
- `AccessibilityMonitor` stored in delegate's instance variables
- No global state - all state in structs/ivars
- `stop()` uses `NSApplication::sharedApplication()` (framework singleton)

#### Linux: X11 Property Monitoring

**Implementation:**
- Single event loop monitoring X11 property changes
- Monitors `_NET_ACTIVE_WINDOW` property for focus changes
- Monitors `_NET_WM_NAME` and `WM_NAME` for window titles (detects tab switches)
- Uses `select()` with self-pipe for interruptible event waiting
- No separate app/window distinction (X11 is window-centric)

**Why simpler?** X11 doesn't have a strong app concept like macOS - everything is window-based. Single event loop handles all focus changes.

**Information Gathering:**
- **X11 Properties**: Window title, app name (WM_CLASS), PID (_NET_WM_PID)
- **Window ID**: Direct X11 window ID

**Architecture:**
- `X11Monitor` manages X11 connection and event loop
- Minimal global state: `OnceLock<RawFd>` for interrupt pipe write end (needed for `stop()`)
- `stop()` writes to interrupt pipe to wake up `select()`

### Why Static `stop()`?

`run()` consumes `self` and blocks until stopped, so code after it won't execute:

```rust
let monitor = Monitor::new(handler);
monitor.run()?;  // Blocks here - consumes monitor
// Code here never runs until run() returns
monitor.stop()?; // ❌ Can't call - monitor was moved!
```

To make instance-based `stop()` work, you'd need to:
- Store the monitor instance globally (e.g., `OnceLock<Arc<Monitor>>`)
- Change `run()` to not consume `self` (adds complexity)
- Store more state than needed (we only need a way to signal stop)

Static `stop()` is simpler because:
- Only stores what's needed (interrupt pipe on Linux, uses framework singleton on macOS)
- Less state, simpler code

### Event Flow

All focus changes (app switches, window changes, tab switches) flow through a single `on_focus_change()` callback:

**macOS - App Switch:**
```
User switches app
→ NSWorkspace notification (app_did_activate)
→ Creates Accessibility observer for new app
→ on_focus_change(window) with full context
```

**macOS - Window/Tab Switch:**
```
User switches window/tab
→ Accessibility notification (window_change_callback)
→ on_focus_change(window) with full context
```

**Linux - Focus Change:**
```
User switches window
→ X11 PropertyNotify (_NET_ACTIVE_WINDOW)
→ on_focus_change(window) with full context
```

**Linux - Title Change (Tab Switch):**
```
User switches tab
→ X11 PropertyNotify (_NET_WM_NAME)
→ on_focus_change(window) with full context
```

### Memory Safety

All unsafe code is:
1. **Documented**: Every unsafe block explains why it should be safe
2. **Encapsulated**: Internal to platform modules
3. **Minimal**: Only where FFI requires it

**Known limitation (macOS)**: Handler pointers in Accessibility API are intentionally "leaked" because the API doesn't provide cleanup callbacks. Acceptable because only one handler per PID exists and it's cleaned up on app switch.

## 💡 Resources / References

- [active-win-pos-rs](https://github.com/dimusic/active-win-pos-rs)
- [winshift-rs](https://github.com/efJerryYang/winshift-rs)
- [ferrous-focus](https://github.com/eurora-labs/ferrous-focus)
- [aw-watcher-window](https://github.com/ActivityWatch/aw-watcher-window)