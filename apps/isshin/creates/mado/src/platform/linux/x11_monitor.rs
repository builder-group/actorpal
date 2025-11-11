//! X11 event monitoring
//!
//! This module monitors window focus changes using X11 property notifications.
//! Unlike macOS, X11 doesn't have separate app/window concepts - everything is window-based.
//!
//! ## Architecture
//!
//! The monitor uses a single event loop that:
//! 1. Monitors `_NET_ACTIVE_WINDOW` property changes for window focus switches
//! 2. Monitors `_NET_WM_NAME` and `WM_NAME` property changes for title changes (tab switches)
//! 3. Uses `select()` with a self-pipe for interruptible event waiting
//!
//! ## Why Unsafe?
//!
//! X11 is a C API that requires:
//! - Raw pointers for display and window objects
//! - FFI calls to libX11
//! - Manual memory management of X11 resources
//! - C-style event structures

use std::os::unix::io::RawFd;
use std::sync::{Arc, RwLock};

use libc::{c_void, close, pipe, read, write, EINTR};
use libc::{fd_set, select, FD_SET, FD_ZERO};
use x11::xlib;

use crate::config::MonitorConfig;
use crate::error::Error;
use crate::handler::EventHandler;
use crate::types::WindowInfo;

use super::x11_helpers;

/// Global interrupt pipe write end for stop() to access
///
/// This is necessary because stop() is static and needs to signal the event loop
/// to stop. The write end is stored here when run() starts, and cleared when run() exits.
static INTERRUPT_WRITE: std::sync::OnceLock<RawFd> = std::sync::OnceLock::new();

/// X11 monitor for window focus changes
pub struct X11Monitor {
    handler: Arc<RwLock<dyn EventHandler>>,
    config: MonitorConfig,
}

impl X11Monitor {
    pub fn new(handler: Arc<RwLock<dyn EventHandler>>, config: MonitorConfig) -> Self {
        Self { handler, config }
    }

    /// Start monitoring (blocks until stopped)
    pub fn run(&self) -> Result<(), Error> {
        unsafe {
            let mut interrupt_pipe = [-1, -1];
            if pipe(interrupt_pipe.as_mut_ptr()) != 0 {
                return Err(Error::Platform(
                    "Failed to create interrupt pipe".to_string(),
                ));
            }

            // Store write end globally so stop() can access it
            let _ = INTERRUPT_WRITE.set(interrupt_pipe[1]);

            let display = xlib::XOpenDisplay(std::ptr::null());
            if display.is_null() {
                close(interrupt_pipe[0]);
                close(interrupt_pipe[1]);
                return Err(Error::Platform("Failed to open X11 display".to_string()));
            }

            let root = xlib::XDefaultRootWindow(display);
            // Request property change and substructure notifications on root window
            // PropertyChangeMask: for _NET_ACTIVE_WINDOW and window title changes
            // SubstructureNotifyMask: for window create/destroy events
            xlib::XSelectInput(
                display,
                root,
                xlib::PropertyChangeMask | xlib::SubstructureNotifyMask,
            );

            // X11 atoms are identifiers for properties. We intern them once for efficiency.
            let active_window_atom =
                xlib::XInternAtom(display, b"_NET_ACTIVE_WINDOW\0".as_ptr() as *const i8, 0);
            let wm_name_atom = xlib::XInternAtom(display, b"WM_NAME\0".as_ptr() as *const i8, 0);
            let net_wm_name_atom =
                xlib::XInternAtom(display, b"_NET_WM_NAME\0".as_ptr() as *const i8, 0);
            let wm_class_atom = xlib::XInternAtom(display, b"WM_CLASS\0".as_ptr() as *const i8, 0);
            let net_wm_pid_atom =
                xlib::XInternAtom(display, b"_NET_WM_PID\0".as_ptr() as *const i8, 0);

            let mut active_window: xlib::Window = 0;
            let mut last_window_info: Option<WindowInfo> = None;

            let old_handler = x11_helpers::setup_error_handler();

            // Set up select() to wait on both X11 events and interrupt pipe
            // This allows us to cleanly stop the event loop from another thread
            let x11_fd = xlib::XConnectionNumber(display) as RawFd;
            let mut in_fds: fd_set = std::mem::zeroed();
            FD_ZERO(&mut in_fds);
            FD_SET(x11_fd, &mut in_fds);
            FD_SET(interrupt_pipe[0], &mut in_fds);
            let max_fd = x11_fd.max(interrupt_pipe[0]) + 1;

            // Notify initial state before entering event loop
            if let Some(window_info) = get_window_info(
                display,
                root,
                active_window_atom,
                wm_name_atom,
                net_wm_name_atom,
                wm_class_atom,
                net_wm_pid_atom,
            ) {
                if let Ok(guard) = self.handler.read() {
                    guard.on_focus_change(window_info.clone());
                }
                last_window_info = Some(window_info);
                active_window = x11_helpers::get_active_window(display, root, active_window_atom);
            }

            loop {
                let mut read_fds = in_fds;

                let select_result = select(
                    max_fd,
                    &mut read_fds,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                );

                if select_result > 0 {
                    if libc::FD_ISSET(interrupt_pipe[0], &read_fds) {
                        let mut buf = [0u8; 1];
                        read(interrupt_pipe[0], buf.as_mut_ptr() as *mut c_void, 1);
                        break;
                    }

                    if libc::FD_ISSET(x11_fd, &read_fds) {
                        while xlib::XPending(display) > 0 {
                            let mut event: xlib::XEvent = std::mem::zeroed();
                            xlib::XNextEvent(display, &mut event);

                            match event.get_type() {
                                xlib::PropertyNotify => {
                                    let xproperty = event.property;

                                    // Active window changed (user switched windows)
                                    if xproperty.atom == active_window_atom {
                                        let new_active_window = x11_helpers::get_active_window(
                                            display,
                                            root,
                                            active_window_atom,
                                        );

                                        if new_active_window != active_window {
                                            active_window = new_active_window;

                                            if let Some(window_info) = get_window_info(
                                                display,
                                                root,
                                                active_window_atom,
                                                wm_name_atom,
                                                net_wm_name_atom,
                                                wm_class_atom,
                                                net_wm_pid_atom,
                                            ) {
                                                let app_changed = last_window_info
                                                    .as_ref()
                                                    .map(|last| {
                                                        last.app.bundle_id
                                                            != window_info.app.bundle_id
                                                    })
                                                    .unwrap_or(true);
                                                if self.config.track_window_changes || app_changed {
                                                    if let Ok(guard) = self.handler.read() {
                                                        guard.on_focus_change(window_info.clone());
                                                    }
                                                }

                                                last_window_info = Some(window_info);
                                            }
                                        }
                                    }
                                    // Window title changed (tab switch, document change, etc.)
                                    else if self.config.track_window_changes
                                        && (xproperty.atom == wm_name_atom
                                            || xproperty.atom == net_wm_name_atom)
                                        && xproperty.window == active_window
                                    {
                                        if let Some(window_info) = get_window_info(
                                            display,
                                            root,
                                            active_window_atom,
                                            wm_name_atom,
                                            net_wm_name_atom,
                                            wm_class_atom,
                                            net_wm_pid_atom,
                                        ) {
                                            let title_changed = last_window_info
                                                .as_ref()
                                                .map(|last| last.title != window_info.title)
                                                .unwrap_or(true);

                                            if title_changed {
                                                if let Ok(guard) = self.handler.read() {
                                                    guard.on_focus_change(window_info.clone());
                                                }
                                                last_window_info = Some(window_info);
                                            }
                                        }
                                    }
                                }
                                // Window created or destroyed - refresh active window
                                xlib::CreateNotify | xlib::DestroyNotify => {
                                    active_window = x11_helpers::get_active_window(
                                        display,
                                        root,
                                        active_window_atom,
                                    );

                                    if let Some(window_info) = get_window_info(
                                        display,
                                        root,
                                        active_window_atom,
                                        wm_name_atom,
                                        net_wm_name_atom,
                                        wm_class_atom,
                                        net_wm_pid_atom,
                                    ) {
                                        let app_changed = last_window_info
                                            .as_ref()
                                            .map(|last| {
                                                last.app.bundle_id != window_info.app.bundle_id
                                            })
                                            .unwrap_or(true);
                                        if self.config.track_window_changes || app_changed {
                                            if let Ok(guard) = self.handler.read() {
                                                guard.on_focus_change(window_info.clone());
                                            }
                                        }

                                        last_window_info = Some(window_info);
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                } else if select_result < 0 {
                    // Check if select() was interrupted by a signal (EINTR)
                    // If so, just continue the loop. Otherwise, it's a real error.
                    if *libc::__errno_location() != EINTR {
                        // Real error - could log here, but for now just continue
                        // The loop will retry on next iteration
                    }
                }
            }

            // Reset error handler before cleanup
            xlib::XSetErrorHandler(old_handler);
            xlib::XCloseDisplay(display);
            close(interrupt_pipe[0]);
            close(interrupt_pipe[1]);
        }

        return Ok(());
    }

    /// Stop the monitor
    ///
    /// Can be called from any thread. Sends a signal through the interrupt pipe
    /// to stop the event loop.
    pub fn stop() -> Result<(), Error> {
        unsafe {
            if let Some(write_fd) = INTERRUPT_WRITE.get() {
                let buf = [0u8; 1];
                if write(*write_fd, buf.as_ptr() as *const c_void, 1) != 1 {
                    return Err(Error::Platform("Failed to send stop signal".to_string()));
                }
                return Ok(());
            }
            return Err(Error::Platform("Monitor not running".to_string()));
        }
    }
}

/// Get complete window information from X11
unsafe fn get_window_info(
    display: *mut xlib::Display,
    root: xlib::Window,
    active_window_atom: xlib::Atom,
    wm_name_atom: xlib::Atom,
    net_wm_name_atom: xlib::Atom,
    wm_class_atom: xlib::Atom,
    net_wm_pid_atom: xlib::Atom,
) -> Option<WindowInfo> {
    let window = x11_helpers::get_active_window(display, root, active_window_atom);
    if window == 0 {
        return None;
    }

    let title = x11_helpers::get_window_title(display, window, wm_name_atom, net_wm_name_atom)?;
    let app_name = x11_helpers::get_window_class(display, window, wm_class_atom)
        .unwrap_or_else(|| "Unknown".to_string());
    let pid = x11_helpers::get_window_pid(display, window, net_wm_pid_atom).unwrap_or(0);

    return Some(WindowInfo {
        title,
        window_id: window as u32,
        bounds: crate::types::WindowBounds::default(), // X11 doesn't provide bounds in property notifications
        app: crate::types::AppInfo {
            pid,
            name: app_name.clone(),
            bundle_id: app_name,         // Linux doesn't have bundle IDs
            process_path: String::new(), // Could be implemented via /proc/{pid}/exe
        },
        browser: None, // Browser info not supported on Linux yet
    });
}
