use super::{accessibility, app_info};
use crate::types::{WindowBounds, WindowInfo};
use core_foundation::{
    array::CFArray,
    base::{CFGetTypeID, TCFType},
    boolean::{kCFBooleanTrue, CFBooleanRef},
    dictionary::{CFDictionary, __CFDictionary},
    number::{CFNumber, __CFNumber},
    string::{CFString, CFStringGetTypeID, CFStringRef},
};
use std::ffi;

// Link to CoreGraphics framework
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGWindowListCopyWindowInfo(option: u32, relativeToWindow: u32) -> *mut ffi::c_void;
}

/// Get information about the current focused window.
///
/// Aggregates data from multiple sources:
/// - NSWorkspace for app information
/// - Accessibility API for window title
/// - CoreGraphics for stable window ID and bounds
pub fn get_current_window() -> Option<WindowInfo> {
    let app = app_info::get_current_app()?;
    let title = accessibility::get_current_window_title();
    let (window_id, bounds) = find_window_id_and_bounds(app.pid, title.as_deref().unwrap_or(""));

    return Some(WindowInfo {
        title,
        window_id,
        bounds,
        app,
        browser: None,
    });
}

/// Find window ID and bounds for a process.
///
/// Uses two strategies:
/// 1. Exact title match (most accurate because a process might have multiple windows with different titles)
/// 2. First window matching PID (fallback when title doesn't match or is empty)
pub fn find_window_id_and_bounds(pid: i32, title: &str) -> (Option<u32>, Option<WindowBounds>) {
    let windows = match get_window_list() {
        Some(windows) => windows,
        None => return (None, None),
    };

    // Try to get window info via title match first (a process might have multiple windows with different titles)
    if !title.is_empty() {
        for i in 0..windows.len() {
            let d = match windows.get(i) {
                Some(d) => d,
                None => continue,
            };

            if dict_get_i32(&d, "kCGWindowOwnerPID") != Some(pid)
                || dict_get_string(&d, "kCGWindowName") != Some(title.to_string())
                || !matches_window_criteria(&d, pid)
            {
                continue;
            }

            let id = dict_get_i32(&d, "kCGWindowNumber");
            let bounds = dict_get_bounds(&d);
            return (id.map(|id| id as u32), bounds);
        }
    }

    // Fallback to get window info via PID match (when title doesn't match)
    for i in 0..windows.len() {
        let d = match windows.get(i) {
            Some(d) => d,
            None => continue,
        };

        if !matches_window_criteria(&d, pid) {
            continue;
        }

        let id = dict_get_i32(&d, "kCGWindowNumber");
        let bounds = dict_get_bounds(&d);
        return (id.map(|id| id as u32), bounds);
    }

    return (None, None);
}

/// Check if window matches selection criteria.
///
/// A window matches if it:
/// - Belongs to the specified process (PID matches)
/// - Is visible on-screen
/// - Has non-zero alpha (not fully transparent)
/// - Prefers layer 0 (normal windows), but accepts other layers if onscreen
fn matches_window_criteria(d: &CFDictionary, pid: i32) -> bool {
    // Belongs to the specified process (PID matches)
    if dict_get_i32(d, "kCGWindowOwnerPID") != Some(pid) {
        return false;
    }

    // Is visible on-screen
    if dict_get_bool(d, "kCGWindowIsOnscreen") != Some(true) {
        let window_id = dict_get_i32(d, "kCGWindowNumber");
        let window_layer = dict_get_i32(d, "kCGWindowLayer");
        let window_title = dict_get_string(d, "kCGWindowName").unwrap_or_default();
        eprintln!(
            "[WindowInfo] Window rejected (PID {}, ID {:?}, layer {:?}, title: \"{}\"): not on-screen",
            pid, window_id, window_layer, window_title
        );
        return false;
    }

    // Has non-zero alpha (not fully transparent)
    if !dict_get_f64(d, "kCGWindowAlpha")
        .map(|a| a > 0.0)
        .unwrap_or(false)
    {
        let window_id = dict_get_i32(d, "kCGWindowNumber");
        let window_layer = dict_get_i32(d, "kCGWindowLayer");
        let window_title = dict_get_string(d, "kCGWindowName").unwrap_or_default();
        eprintln!(
            "[WindowInfo] Window rejected (PID {}, ID {:?}, layer {:?}, title: \"{}\"): alpha is {:?}, expected > 0",
            pid, window_id, window_layer, window_title, dict_get_f64(d, "kCGWindowAlpha")
        );
        return false;
    }

    // Prefer layer 0 (normal windows), but log if using other layers
    let window_layer = dict_get_i32(d, "kCGWindowLayer");
    if window_layer != Some(0) {
        let window_id = dict_get_i32(d, "kCGWindowNumber");
        let window_title = dict_get_string(d, "kCGWindowName").unwrap_or_default();
        eprintln!(
            "[WindowInfo] Window accepted with non-zero layer (PID {}, ID {:?}, layer {:?}, title: \"{}\")",
            pid, window_id, window_layer, window_title
        );
    }

    return true;
}

/// Get list of on-screen windows (excludes desktop elements).
fn get_window_list() -> Option<CFArray<CFDictionary>> {
    let arr = unsafe { CGWindowListCopyWindowInfo((1 << 0) | (1 << 4), 0) };
    if arr.is_null() {
        return None;
    }

    return Some(unsafe {
        CFArray::<CFDictionary>::wrap_under_create_rule(
            arr as *const core_foundation::array::__CFArray,
        )
    });
}

/// Extract i32 value from CoreGraphics window dictionary.
///
/// Converts CFNumber to Rust i32. Returns None if key is missing or value is null.
fn dict_get_i32(d: &CFDictionary, key: &'static str) -> Option<i32> {
    let k = CFString::from_static_string(key);
    let v = *d.get(k.as_concrete_TypeRef() as *const _);
    if v.is_null() {
        return None;
    }
    return unsafe { CFNumber::wrap_under_get_rule(v as *const __CFNumber) }.to_i32();
}

/// Extract bool value from CoreGraphics window dictionary.
///
/// Compares CFBoolean to kCFBooleanTrue. Returns None if key is missing or value is null.
fn dict_get_bool(d: &CFDictionary, key: &'static str) -> Option<bool> {
    let k = CFString::from_static_string(key);
    let v = *d.get(k.as_concrete_TypeRef() as *const _);
    if v.is_null() {
        return None;
    }
    return Some((v as CFBooleanRef) == unsafe { kCFBooleanTrue });
}

/// Extract f64 value from CoreGraphics window dictionary.
///
/// Converts CFNumber to Rust f64. Returns None if key is missing or value is null.
fn dict_get_f64(d: &CFDictionary, key: &'static str) -> Option<f64> {
    let k = CFString::from_static_string(key);
    let v = *d.get(k.as_concrete_TypeRef() as *const _);
    if v.is_null() {
        return None;
    }
    return unsafe { CFNumber::wrap_under_get_rule(v as *const __CFNumber) }.to_f64();
}

/// Extract String value from CoreGraphics window dictionary.
///
/// Converts CFString to Rust String. Returns None if key is missing, value is null, or type is not CFString.
fn dict_get_string(d: &CFDictionary, key: &'static str) -> Option<String> {
    let k = CFString::from_static_string(key);
    let key_ptr = k.as_concrete_TypeRef() as *const _;
    if !d.contains_key(&key_ptr) {
        return None;
    }
    let v = *d.get(key_ptr);
    if v.is_null() {
        return None;
    }
    if unsafe { CFGetTypeID(v) } != unsafe { CFStringGetTypeID() } {
        return None;
    }
    return Some(unsafe { CFString::wrap_under_get_rule(v as CFStringRef) }.to_string());
}

/// Extract window bounds (x, y, width, height) from CoreGraphics window dictionary.
///
/// Reads nested dictionary at "kCGWindowBounds" and extracts X, Y, Width, Height as f64 values.
/// Returns None if any value is missing or invalid.
fn dict_get_bounds(d: &CFDictionary) -> Option<WindowBounds> {
    let bounds_key = CFString::from_static_string("kCGWindowBounds");
    let ptr = *d.get(bounds_key.as_concrete_TypeRef() as *const _);
    if ptr.is_null() {
        return None;
    }
    let dict = unsafe {
        CFDictionary::<CFString, CFNumber>::wrap_under_get_rule(ptr as *const __CFDictionary)
    };

    let x_key = CFString::from_static_string("X");
    let y_key = CFString::from_static_string("Y");
    let w_key = CFString::from_static_string("Width");
    let h_key = CFString::from_static_string("Height");

    let x = dict.get(x_key.as_concrete_TypeRef() as *const _).to_f64();
    let y = dict.get(y_key.as_concrete_TypeRef() as *const _).to_f64();
    let w = dict.get(w_key.as_concrete_TypeRef() as *const _).to_f64();
    let h = dict.get(h_key.as_concrete_TypeRef() as *const _).to_f64();

    return match (x, y, w, h) {
        (Some(x), Some(y), Some(w), Some(h)) => Some(WindowBounds {
            x,
            y,
            width: w,
            height: h,
        }),
        _ => None,
    };
}
