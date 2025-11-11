//! Window information gathering
//!
//! Pure data aggregator that combines X11 properties into WindowInfo/AppInfo.
//! Creates temporary X11 connections for on-demand queries.

use crate::types::{AppInfo, WindowBounds, WindowInfo};

use super::x11_helpers;

/// Get information about the current active application
pub fn get_current_app() -> Option<AppInfo> {
    return get_current_window().map(|w| w.app);
}

/// Get information about the current focused window
pub fn get_current_window() -> Option<WindowInfo> {
    unsafe {
        let display = x11::xlib::XOpenDisplay(std::ptr::null());
        if display.is_null() {
            return None;
        }

        let root = x11::xlib::XDefaultRootWindow(display);
        let active_window_atom =
            x11::xlib::XInternAtom(display, b"_NET_ACTIVE_WINDOW\0".as_ptr() as *const i8, 0);
        let wm_name_atom = x11::xlib::XInternAtom(display, b"WM_NAME\0".as_ptr() as *const i8, 0);
        let net_wm_name_atom =
            x11::xlib::XInternAtom(display, b"_NET_WM_NAME\0".as_ptr() as *const i8, 0);
        let wm_class_atom = x11::xlib::XInternAtom(display, b"WM_CLASS\0".as_ptr() as *const i8, 0);
        let net_wm_pid_atom =
            x11::xlib::XInternAtom(display, b"_NET_WM_PID\0".as_ptr() as *const i8, 0);

        let window = x11_helpers::get_active_window(display, root, active_window_atom);
        if window == 0 {
            x11::xlib::XCloseDisplay(display);
            return None;
        }

        let title = x11_helpers::get_window_title(display, window, wm_name_atom, net_wm_name_atom)?;
        let app_name = x11_helpers::get_window_class(display, window, wm_class_atom)
            .unwrap_or_else(|| "Unknown".to_string());
        let pid = x11_helpers::get_window_pid(display, window, net_wm_pid_atom).unwrap_or(0);

        x11::xlib::XCloseDisplay(display);

        return Some(WindowInfo {
            title,
            window_id: window as u32,
            bounds: WindowBounds::default(), // X11 doesn't provide bounds in property queries
            app: AppInfo {
                pid,
                name: app_name.clone(),
                bundle_id: app_name,         // Linux doesn't have bundle IDs
                process_path: String::new(), // Could be implemented via /proc/{pid}/exe
            },
        });
    }
}
