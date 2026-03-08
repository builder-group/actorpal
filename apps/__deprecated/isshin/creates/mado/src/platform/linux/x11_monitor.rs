use super::x11_helpers;
use crate::{
    config::MonitorConfig, error::Error, listener::WindowListener, types::WindowEvent,
    types::WindowInfo,
};
use libc::{c_void, close, fd_set, pipe, read, select, write, EINTR, FD_SET, FD_ZERO};
use std::{
    os::unix::io::RawFd,
    sync::{Arc, RwLock},
};
use x11::xlib;

/// Global interrupt pipe write end for stop() to access.
///
/// stop() is static and needs to signal the event loop to stop.
/// The write end is stored here when run() starts, and cleared when run() exits.
static INTERRUPT_WRITE: std::sync::OnceLock<RawFd> = std::sync::OnceLock::new();

/// Monitor for window focus and title changes using X11.
///
/// Monitors:
/// - Window focus changes (when user switches windows)
/// - Window title changes (to detect e.g. tab switches in browsers)
pub struct X11Monitor {
    listener: Arc<RwLock<dyn WindowListener>>,
    config: MonitorConfig,
}

impl X11Monitor {
    pub fn new(listener: Arc<RwLock<dyn WindowListener>>, config: MonitorConfig) -> Self {
        Self { listener, config }
    }

    /// Start monitoring (blocks until stopped).
    ///
    /// Sets up X11 event monitoring and runs the event loop until `stop()` is called.
    pub fn run(&self) -> Result<(), Error> {
        let mut interrupt_pipe = [-1, -1];
        if unsafe { pipe(interrupt_pipe.as_mut_ptr()) } != 0 {
            return Err(Error::Platform(
                "Failed to create interrupt pipe".to_string(),
            ));
        }

        let _ = INTERRUPT_WRITE.set(interrupt_pipe[1]);

        let display = unsafe { xlib::XOpenDisplay(std::ptr::null()) };
        if display.is_null() {
            unsafe {
                close(interrupt_pipe[0]);
                close(interrupt_pipe[1]);
            }
            return Err(Error::Platform("Failed to open X11 display".to_string()));
        }

        let root = unsafe { xlib::XDefaultRootWindow(display) };
        unsafe {
            xlib::XSelectInput(
                display,
                root,
                xlib::PropertyChangeMask | xlib::SubstructureNotifyMask,
            );
        }

        let active_window_atom =
            unsafe { xlib::XInternAtom(display, b"_NET_ACTIVE_WINDOW\0".as_ptr() as *const i8, 0) };
        let wm_name_atom =
            unsafe { xlib::XInternAtom(display, b"WM_NAME\0".as_ptr() as *const i8, 0) };
        let net_wm_name_atom =
            unsafe { xlib::XInternAtom(display, b"_NET_WM_NAME\0".as_ptr() as *const i8, 0) };
        let wm_class_atom =
            unsafe { xlib::XInternAtom(display, b"WM_CLASS\0".as_ptr() as *const i8, 0) };
        let net_wm_pid_atom =
            unsafe { xlib::XInternAtom(display, b"_NET_WM_PID\0".as_ptr() as *const i8, 0) };

        let mut active_window: xlib::Window = 0;
        let mut last_window_info: Option<WindowInfo> = None;

        let old_handler = unsafe { x11_helpers::setup_error_handler() };

        let x11_fd = unsafe { xlib::XConnectionNumber(display) } as RawFd;
        let mut in_fds: fd_set = std::mem::zeroed();
        unsafe {
            FD_ZERO(&mut in_fds);
            FD_SET(x11_fd, &mut in_fds);
            FD_SET(interrupt_pipe[0], &mut in_fds);
        }
        let max_fd = x11_fd.max(interrupt_pipe[0]) + 1;

        // Send initial window state before entering event loop
        if let Some(window_info) = unsafe {
            get_window_info(
                display,
                root,
                active_window_atom,
                wm_name_atom,
                net_wm_name_atom,
                wm_class_atom,
                net_wm_pid_atom,
            )
        } {
            if let Ok(guard) = self.listener.read() {
                guard.on_focus_change(WindowEvent::WindowChanged {
                    window: window_info.clone(),
                });
            }
            last_window_info = Some(window_info);
            active_window =
                unsafe { x11_helpers::get_active_window(display, root, active_window_atom) };
        }

        // Main event loop: wait for X11 events or stop signal
        loop {
            let mut read_fds = in_fds;

            let select_result = unsafe {
                select(
                    max_fd,
                    &mut read_fds,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                )
            };

            if select_result > 0 {
                // Check for stop signal from another thread
                if unsafe { libc::FD_ISSET(interrupt_pipe[0], &read_fds) } {
                    let mut buf = [0u8; 1];
                    unsafe {
                        read(interrupt_pipe[0], buf.as_mut_ptr() as *mut c_void, 1);
                    }
                    break;
                }

                // Process X11 events
                if unsafe { libc::FD_ISSET(x11_fd, &read_fds) } {
                    while unsafe { xlib::XPending(display) } > 0 {
                        let mut event: xlib::XEvent = std::mem::zeroed();
                        unsafe {
                            xlib::XNextEvent(display, &mut event);
                        }

                        match event.get_type() {
                            xlib::PropertyNotify => {
                                let xproperty = event.property;

                                // Handle active window change (user switched windows)
                                if xproperty.atom == active_window_atom {
                                    let new_active_window = unsafe {
                                        x11_helpers::get_active_window(
                                            display,
                                            root,
                                            active_window_atom,
                                        )
                                    };

                                    if new_active_window == active_window {
                                        continue;
                                    }

                                    active_window = new_active_window;

                                    let window_info = unsafe {
                                        get_window_info(
                                            display,
                                            root,
                                            active_window_atom,
                                            wm_name_atom,
                                            net_wm_name_atom,
                                            wm_class_atom,
                                            net_wm_pid_atom,
                                        )
                                    };

                                    if let Some(window_info) = window_info {
                                        let app_changed = last_window_info
                                            .as_ref()
                                            .map(|last| {
                                                last.app.bundle_id != window_info.app.bundle_id
                                            })
                                            .unwrap_or(true);

                                        if self.config.track_window_changes || app_changed {
                                            if let Ok(guard) = self.listener.read() {
                                                guard.on_focus_change(WindowEvent::WindowChanged {
                                                    window: window_info.clone(),
                                                });
                                            }
                                        }

                                        last_window_info = Some(window_info);
                                    }
                                }
                                // Handle window title change (tab switch, document change, etc.)
                                else if self.config.track_window_changes
                                    && (xproperty.atom == wm_name_atom
                                        || xproperty.atom == net_wm_name_atom)
                                    && xproperty.window == active_window
                                {
                                    let window_info = unsafe {
                                        get_window_info(
                                            display,
                                            root,
                                            active_window_atom,
                                            wm_name_atom,
                                            net_wm_name_atom,
                                            wm_class_atom,
                                            net_wm_pid_atom,
                                        )
                                    };

                                    if let Some(window_info) = window_info {
                                        let title_changed = last_window_info
                                            .as_ref()
                                            .map(|last| last.title != window_info.title)
                                            .unwrap_or(true);

                                        if title_changed {
                                            if let Ok(guard) = self.listener.read() {
                                                guard.on_focus_change(WindowEvent::WindowChanged {
                                                    window: window_info.clone(),
                                                });
                                            }
                                            last_window_info = Some(window_info);
                                        }
                                    }
                                }
                            }
                            // Handle window create/destroy events - refresh active window
                            xlib::CreateNotify | xlib::DestroyNotify => {
                                active_window = unsafe {
                                    x11_helpers::get_active_window(
                                        display,
                                        root,
                                        active_window_atom,
                                    )
                                };

                                let window_info = unsafe {
                                    get_window_info(
                                        display,
                                        root,
                                        active_window_atom,
                                        wm_name_atom,
                                        net_wm_name_atom,
                                        wm_class_atom,
                                        net_wm_pid_atom,
                                    )
                                };

                                if let Some(window_info) = window_info {
                                    let app_changed = last_window_info
                                        .as_ref()
                                        .map(|last| last.app.bundle_id != window_info.app.bundle_id)
                                        .unwrap_or(true);

                                    if self.config.track_window_changes || app_changed {
                                        if let Ok(guard) = self.listener.read() {
                                            guard.on_focus_change(WindowEvent::WindowChanged {
                                                window: window_info.clone(),
                                            });
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
                // Ignore EINTR (interrupted by signal), continue on others
                if unsafe { *libc::__errno_location() } != EINTR {
                    // Real error - loop will retry on next iteration
                }
            }
        }

        // Cleanup: restore error handler and close resources
        unsafe {
            xlib::XSetErrorHandler(old_handler);
            xlib::XCloseDisplay(display);
            close(interrupt_pipe[0]);
            close(interrupt_pipe[1]);
        }

        return Ok(());
    }

    /// Stop the monitor (thread-safe).
    ///
    /// Sends a signal through the interrupt pipe to stop the event loop.
    pub fn stop() -> Result<(), Error> {
        let write_fd = match INTERRUPT_WRITE.get() {
            Some(fd) => fd,
            None => return Err(Error::NotRunning),
        };

        let buf = [0u8; 1];
        if unsafe { write(*write_fd, buf.as_ptr() as *const c_void, 1) } != 1 {
            return Err(Error::Platform("Failed to send stop signal".to_string()));
        }

        return Ok(());
    }
}

/// Get complete window information from X11.
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
        bounds: crate::types::WindowBounds::default(),
        app: crate::types::AppInfo {
            pid,
            name: app_name.clone(),
            bundle_id: app_name,
            process_path: String::new(),
        },
        browser: None,
    });
}
