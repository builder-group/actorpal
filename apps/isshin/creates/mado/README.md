# mado (窓)

> A simple, clean window monitoring library for Rust

## Features

- 🪟 **Query current state** - Get active app/window information on demand
- 📡 **Monitor changes** - Listen to app switches and window changes in real-time
- 📑 **Tab switch detection** - Detects browser tab switches (macOS & Linux)
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

    // Get current active window
    let window = mado::get_active_window()?;
    println!("Window: '{}'", window.title);
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
}
```

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

#### Linux: X11 Property Monitoring

**Implementation:**
- Single event loop monitoring X11 property changes
- Monitors `_NET_ACTIVE_WINDOW` property for focus changes
- Monitors `_NET_WM_NAME` and `WM_NAME` for window titles (detects tab switches)
- Uses `select()` with self-pipe for interruptible monitoring
- No separate app/window distinction (X11 is window-centric)

**Why simpler?** X11 doesn't have a strong app concept like macOS - everything is window-based. Single event loop handles all focus changes.

**Information Gathering:**
- **X11 Properties**: Window title, app name (WM_CLASS), PID (_NET_WM_PID)
- **Window ID**: Direct X11 window ID

### Global State Management *[macOS]*

**Why?** macOS APIs require C-style callbacks that cannot capture Rust closures.

**Safety:**
- Centralized with safe wrappers
- Only accessed on the main thread (CFRunLoop thread)
- Uses `addr_of!`/`addr_of_mut!` for Rust 2024 compatibility

```rust
static mut GLOBAL_HANDLER: Option<Arc<RwLock<dyn EventHandler>>> = None;

pub(super) fn set_handler(handler: Arc<RwLock<dyn EventHandler>>) {
    unsafe {
        let ptr = std::ptr::addr_of_mut!(GLOBAL_HANDLER);
        *ptr = Some(handler);
    }
}
```

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