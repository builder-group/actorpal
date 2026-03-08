use super::x11_helpers;
use crate::types::{AppInfo, WindowBounds, WindowInfo};

/// Get information about the current active application.
pub fn get_current_app() -> Option<AppInfo> {
    return get_current_window().map(|w| w.app);
}

/// Get information about the current focused window.
///
/// Creates a temporary X11 connection, queries window properties, and closes the connection.
/// Returns None if no active window is found or if X11 connection fails.
pub fn get_current_window() -> Option<WindowInfo> {
    let display = unsafe { x11::xlib::XOpenDisplay(std::ptr::null()) };
    if display.is_null() {
        return None;
    }

    let root = unsafe { x11::xlib::XDefaultRootWindow(display) };
    let active_window_atom = unsafe {
        x11::xlib::XInternAtom(display, b"_NET_ACTIVE_WINDOW\0".as_ptr() as *const i8, 0)
    };
    let wm_name_atom =
        unsafe { x11::xlib::XInternAtom(display, b"WM_NAME\0".as_ptr() as *const i8, 0) };
    let net_wm_name_atom =
        unsafe { x11::xlib::XInternAtom(display, b"_NET_WM_NAME\0".as_ptr() as *const i8, 0) };
    let wm_class_atom =
        unsafe { x11::xlib::XInternAtom(display, b"WM_CLASS\0".as_ptr() as *const i8, 0) };
    let net_wm_pid_atom =
        unsafe { x11::xlib::XInternAtom(display, b"_NET_WM_PID\0".as_ptr() as *const i8, 0) };

    let window = unsafe { x11_helpers::get_active_window(display, root, active_window_atom) };
    if window == 0 {
        unsafe {
            x11::xlib::XCloseDisplay(display);
        }
        return None;
    }

    let title =
        unsafe { x11_helpers::get_window_title(display, window, wm_name_atom, net_wm_name_atom) }?;
    let app_name = unsafe { x11_helpers::get_window_class(display, window, wm_class_atom) }
        .unwrap_or_else(|| "Unknown".to_string());
    let pid = unsafe { x11_helpers::get_window_pid(display, window, net_wm_pid_atom) }.unwrap_or(0);

    unsafe {
        x11::xlib::XCloseDisplay(display);
    }

    return Some(WindowInfo {
        title,
        window_id: window as u32,
        bounds: WindowBounds::default(),
        app: AppInfo {
            pid,
            name: app_name.clone(),
            bundle_id: String::new(),
            process_path: String::new(),
        },
        browser: None,
    });
}
