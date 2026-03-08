# mado (窓)

> A simple, clean window monitoring library for Rust

## Features

- Query current state - Get active app/window information on demand
- Monitor changes - Listen to app switches and window changes in real-time
- Tab switch detection - Detects browser tab switches (macOS & Linux)
- Browser URL extraction - Get current browser tab URL (macOS only, optional)
- Cross-platform - macOS and Linux support

## 🌐 Platform Support

- ✅ **macOS**: Full support (NSWorkspace + Accessibility API)
- ✅ **Linux**: Full support (X11)
- 🚧 **Windows**: Planned

### Requirements

**macOS:**

- macOS 10.9+
- **Accessibility permissions** required if `track_window_changes: true` (default)
  - System Settings > Privacy & Security > Accessibility
  - Not required if only tracking app switches (`track_window_changes: false`)
- **Automation permissions** (optional, for browser URL extraction): System Settings > Privacy & Security > Automation

**Linux:**

- X11 display server
- X11 development libraries (`libx11-dev` on Debian/Ubuntu, `libX11-devel` on Fedora)

## 📦 Installation

```toml
[dependencies]
mado = "0.1.0"
```

## 📖 Usage

### Query current state

```rust
use mado;

let app = mado::get_active_app()?;
println!("Current app: {} (PID: {})", app.name, app.pid);

let window = mado::get_active_window()?;
println!("Window: '{}' in {}", window.title, window.app.name);
```

### Listen to changes

```rust
use mado::{WindowListener, WindowMonitor, WindowEvent};

struct FocusListener;

impl WindowListener for FocusListener {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app } => {
                println!("App activated: {}", app.name);
            }
            WindowEvent::WindowChanged { window } => {
                println!("Window: '{}'", window.title);
            }
        }
    }
}

let monitor = WindowMonitor::new(FocusListener);
monitor.run()?;
```

### Browser URL extraction (macOS only)

```rust
use mado::{WindowListener, WindowMonitor, MonitorConfig, WindowEvent};

struct MyListener;

impl WindowListener for MyListener {
    fn on_focus_change(&self, event: WindowEvent) {
        if let WindowEvent::WindowChanged { window } = event {
            if let Some(browser) = &window.browser {
                println!("URL: {}", url);
            }
        }
    }
}

let config = MonitorConfig {
    allow_browser: true, // Requires Automation permission on macOS
};
let monitor = WindowMonitor::with_config(MyListener, config);
monitor.run()?;
```

**Note:** Browser URL extraction requires Automation permission on macOS. If not granted, `window.browser` will be `None`.

### Stop monitoring

```rust
use mado::WindowMonitor;
use std::thread;
use std::time::Duration;

let monitor = WindowMonitor::new(MyListener);

thread::spawn(move || {
    thread::sleep(Duration::from_secs(5));
    WindowMonitor::stop().unwrap();
});

monitor.run()?;
```

### Check permissions (macOS)

```rust
if !mado::is_accessibility_trusted() {
    eprintln!("Please grant accessibility permissions in System Settings");
}
```

## 📐 Architecture

### Why Event-Driven?

Event-driven monitoring provides lower latency, lower CPU usage, and is more battery-friendly. Polling would be inefficient and add latency.

### Why Two Event Types?

Two events handle different scenarios and provide explicit control:

- **`AppActivated`**: Fires immediately when app is activated (even if no window yet, e.g. tray apps). Provides instant app switch detection.
- **`WindowChanged`**: Fires when window data is available. Provides complete context (title, bounds, browser info).

**Why not combine into one event?** A single event with `Option<WindowInfo>` would be less explicit and wouldn't distinguish "app changed" vs "window changed". More importantly, it would miss app activations when apps don't have windows (e.g. tray apps, apps activated via Spotlight before opening a window). Consumers might need to know the app was activated even if no window exists yet.

### Platform Implementation

#### macOS: Two-Layer Monitoring

**1. App Switching** (`NSWorkspace`)

- Monitors `NSWorkspaceDidActivateApplicationNotification`
- Sends `AppActivated` immediately, then `WindowChanged` when window ready
- Creates Accessibility observer for new app

**2. Window Changes** (Accessibility API)

- Monitors `kAXFocusedWindowChangedNotification` and `kAXTitleChangedNotification`
- Detects tab switches via title changes
- Sends `WindowChanged` for all window/title changes

**Data sources**: NSWorkspace (app metadata), Accessibility API (window title), CoreGraphics (window ID/bounds)

#### Linux: X11 Property Monitoring

**Implementation**: Single event loop monitoring `_NET_ACTIVE_WINDOW` and `_NET_WM_NAME`. Uses `select()` with self-pipe for interruptible waiting.

**Data sources**: X11 properties (title, WM_CLASS, PID), direct window ID

### Why Static `stop()`?

`run()` consumes `self` and blocks, so instance-based `stop()` can't be called. Static `stop()` only stores what's needed (interrupt pipe on Linux, framework singleton on macOS), which is simpler than storing a global `Arc<WindowMonitor>`.

### Event Flow

**macOS App Switch**: NSWorkspace notification → `AppActivated` → Accessibility observer → `WindowChanged`

**macOS Window/Tab Switch**: Accessibility notification → `WindowChanged`

**Linux Focus Change**: X11 PropertyNotify → `WindowChanged`

## 💡 Resources / References

- [active-win-pos-rs](https://github.com/dimusic/active-win-pos-rs)
- [winshift-rs](https://github.com/efJerryYang/winshift-rs)
- [ferrous-focus](https://github.com/eurora-labs/ferrous-focus)
- [aw-watcher-window](https://github.com/ActivityWatch/aw-watcher-window)
- [nsworkspace-rs](https://github.com/mishamyrt/nsworkspace-rs)
