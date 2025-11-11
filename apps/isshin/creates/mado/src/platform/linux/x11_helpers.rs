//! X11 property helpers
//!
//! This module provides low-level functions for querying X11 window properties.
//! These are pure data extraction functions with no event handling.
//!
//! ## Why Unsafe?
//!
//! X11 is a C API that requires:
//! - Raw pointers and manual memory management
//! - FFI calls to libX11
//! - Handling of C strings and property data
//!
//! We encapsulate all unsafe code and provide safe public interfaces.

use std::ffi::CStr;

use libc::{c_char, c_int, c_ulong, c_void};
use x11::xlib;

/// Get the currently active window ID
pub(super) unsafe fn get_active_window(
    display: *mut xlib::Display,
    root: xlib::Window,
    active_window_atom: xlib::Atom,
) -> xlib::Window {
    let mut actual_type: xlib::Atom = 0;
    let mut actual_format: c_int = 0;
    let mut nitems: c_ulong = 0;
    let mut bytes_after: c_ulong = 0;
    let mut prop: *mut c_char = std::ptr::null_mut();

    if xlib::XGetWindowProperty(
        display,
        root,
        active_window_atom,
        0,
        1,
        xlib::False as i32,
        xlib::XA_WINDOW,
        &mut actual_type,
        &mut actual_format,
        &mut nitems,
        &mut bytes_after,
        &mut prop as *mut *mut c_char as *mut *mut c_uchar,
    ) == 0
        && !prop.is_null()
    {
        let window = *(prop as *const xlib::Window);
        xlib::XFree(prop as *mut c_void);
        window
    } else {
        0
    }
}

/// Get window title (tries _NET_WM_NAME first, falls back to WM_NAME)
///
/// _NET_WM_NAME is UTF-8 encoded and preferred. WM_NAME is legacy and may be
/// in the locale encoding.
pub(super) unsafe fn get_window_title(
    display: *mut xlib::Display,
    window: xlib::Window,
    wm_name_atom: xlib::Atom,
    net_wm_name_atom: xlib::Atom,
) -> Option<String> {
    let mut actual_type: xlib::Atom = 0;
    let mut actual_format: c_int = 0;
    let mut nitems: c_ulong = 0;
    let mut bytes_after: c_ulong = 0;
    let mut prop: *mut c_char = std::ptr::null_mut();

    // Try _NET_WM_NAME first (UTF-8, modern standard)
    if xlib::XGetWindowProperty(
        display,
        window,
        net_wm_name_atom,
        0,
        1024,
        xlib::False as i32,
        xlib::XInternAtom(display, b"UTF8_STRING\0".as_ptr() as *const i8, 0),
        &mut actual_type,
        &mut actual_format,
        &mut nitems,
        &mut bytes_after,
        &mut prop as *mut *mut c_char as *mut *mut c_uchar,
    ) == 0
        && !prop.is_null()
    {
        let title = CStr::from_ptr(prop).to_string_lossy().into_owned();
        xlib::XFree(prop as *mut c_void); // Must free X11-allocated memory
        return Some(title);
    }

    // Fallback to WM_NAME (legacy, locale encoding)
    if xlib::XGetWindowProperty(
        display,
        window,
        wm_name_atom,
        0,
        1024,
        xlib::False as i32,
        xlib::XA_STRING,
        &mut actual_type,
        &mut actual_format,
        &mut nitems,
        &mut bytes_after,
        &mut prop as *mut *mut c_char as *mut *mut c_uchar,
    ) == 0
        && !prop.is_null()
    {
        let title = CStr::from_ptr(prop).to_string_lossy().into_owned();
        xlib::XFree(prop as *mut c_void); // Must free X11-allocated memory
        return Some(title);
    }

    None
}

/// Get window class (application name)
pub(super) unsafe fn get_window_class(
    display: *mut xlib::Display,
    window: xlib::Window,
    wm_class_atom: xlib::Atom,
) -> Option<String> {
    let mut actual_type: xlib::Atom = 0;
    let mut actual_format: c_int = 0;
    let mut nitems: c_ulong = 0;
    let mut bytes_after: c_ulong = 0;
    let mut prop: *mut c_char = std::ptr::null_mut();

    if xlib::XGetWindowProperty(
        display,
        window,
        wm_class_atom,
        0,
        1024,
        xlib::False as i32,
        xlib::XA_STRING,
        &mut actual_type,
        &mut actual_format,
        &mut nitems,
        &mut bytes_after,
        &mut prop as *mut *mut c_char as *mut *mut c_uchar,
    ) == 0
        && !prop.is_null()
    {
        let class = CStr::from_ptr(prop).to_string_lossy().into_owned();
        xlib::XFree(prop as *mut c_void);
        return Some(class);
    }

    None
}

/// Get window PID
pub(super) unsafe fn get_window_pid(
    display: *mut xlib::Display,
    window: xlib::Window,
    net_wm_pid_atom: xlib::Atom,
) -> Option<i32> {
    let mut actual_type: xlib::Atom = 0;
    let mut actual_format: c_int = 0;
    let mut nitems: c_ulong = 0;
    let mut bytes_after: c_ulong = 0;
    let mut prop: *mut c_char = std::ptr::null_mut();

    if xlib::XGetWindowProperty(
        display,
        window,
        net_wm_pid_atom,
        0,
        1,
        xlib::False as i32,
        xlib::XA_CARDINAL,
        &mut actual_type,
        &mut actual_format,
        &mut nitems,
        &mut bytes_after,
        &mut prop as *mut *mut c_char as *mut *mut c_uchar,
    ) == 0
        && !prop.is_null()
    {
        let pid = *(prop as *const c_ulong) as i32;
        xlib::XFree(prop as *mut c_void);
        return Some(pid);
    }

    None
}

/// X11 error handler - ignores BadWindow errors
///
/// BadWindow errors occur when we query properties of windows that were just destroyed.
/// This is normal in a windowing system and we can safely ignore them.
unsafe extern "C" fn x_error_handler(
    _: *mut xlib::Display,
    error: *mut xlib::XErrorEvent,
) -> c_int {
    if (*error).error_code == xlib::BadWindow as libc::c_uchar {
        return 0;
    }
    0
}

/// Set up X11 error handler
pub(super) unsafe fn setup_error_handler(
) -> Option<unsafe extern "C" fn(*mut xlib::Display, *mut xlib::XErrorEvent) -> c_int> {
    xlib::XSetErrorHandler(Some(x_error_handler))
}
