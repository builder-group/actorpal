//! Window information gathering
//!
//! This module aggregates window information from multiple sources:
//! - NSWorkspace for app information
//! - Accessibility API for window title
//! - CoreGraphics for stable window ID and bounds
//!
//! It provides both a full query API and optimized helpers for building WindowInfo
//! from partial data (used in callbacks).

use std::ffi;

use core_foundation::array::CFArray;
use core_foundation::base::{CFGetTypeID, TCFType};
use core_foundation::boolean::{kCFBooleanTrue, CFBooleanRef};
use core_foundation::dictionary::{CFDictionary, __CFDictionary};
use core_foundation::number::CFNumber;
use core_foundation::number::__CFNumber;
use core_foundation::string::{CFString, CFStringGetTypeID, CFStringRef};

use crate::types::{AppInfo, WindowBounds, WindowInfo};

use super::accessibility;
use super::workspace;

// Link to CoreGraphics framework
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGWindowListCopyWindowInfo(option: u32, relativeToWindow: u32) -> *mut ffi::c_void;
}

/// Get information about the current active application
pub fn get_current_app() -> Option<AppInfo> {
    let pid = workspace::get_current_pid()?;
    let name = workspace::get_app_name(pid)?;
    let bundle_id = workspace::get_bundle_id(pid).unwrap_or_default();
    let process_path = workspace::get_process_path(pid).unwrap_or_default();

    return Some(AppInfo {
        pid,
        name,
        bundle_id,
        process_path,
    });
}

/// Get information about the current focused window
///
/// This aggregates data from multiple sources:
/// 1. NSWorkspace for app info
/// 2. Accessibility API for window title
/// 3. CoreGraphics for stable window ID and bounds
pub fn get_current_window() -> Option<WindowInfo> {
    let pid = workspace::get_current_pid()?;
    let app = get_current_app()?;
    let title = accessibility::get_window_title(pid).unwrap_or_default();

    // CoreGraphics provides more reliable window IDs and bounds
    let (window_id, bounds) = find_window_info(pid, &title).unwrap_or((0, Default::default()));

    return Some(WindowInfo {
        title,
        window_id,
        bounds,
        app,
    });
}

/// Build WindowInfo from partial data (optimized for callbacks)
///
/// This is more efficient than calling `get_current_window()` because it:
/// - Uses the provided title instead of querying Accessibility API again
/// - Only queries CoreGraphics for window ID and bounds
/// - Reuses app info if provided
pub fn build_window_info(pid: i32, title: String, app: Option<AppInfo>) -> Option<WindowInfo> {
    let app = app.or_else(get_current_app)?;
    let (window_id, bounds) = find_window_info(pid, &title).unwrap_or((0, Default::default()));

    return Some(WindowInfo {
        title,
        window_id,
        bounds,
        app,
    });
}

/// Find window ID and bounds by matching PID and optionally title
///
/// Returns: (window_id, bounds)
fn find_window_info(pid: i32, title: &str) -> Option<(u32, WindowBounds)> {
    let windows = get_window_list()?;

    // Two-pass strategy: exact title match first, then fallback to PID match
    if !title.is_empty() {
        for i in 0..windows.len() {
            if let Some(d) = windows.get(i) {
                if !matches_window_criteria(&d, pid) {
                    continue;
                }

                if let Some(window_title) = dict_get_string(&d, "kCGWindowName") {
                    if window_title == title {
                        if let Some(id) = dict_get_i32(&d, "kCGWindowNumber") {
                            let bounds = dict_get_bounds(&d).unwrap_or_default();
                            return Some((id as u32, bounds));
                        }
                    }
                }
            }
        }
    }

    // Fallback: first matching PID (when title doesn't match or is empty)
    for i in 0..windows.len() {
        if let Some(d) = windows.get(i) {
            if !matches_window_criteria(&d, pid) {
                continue;
            }

            if let Some(id) = dict_get_i32(&d, "kCGWindowNumber") {
                let bounds = dict_get_bounds(&d).unwrap_or_default();
                return Some((id as u32, bounds));
            }
        }
    }

    return None;
}

/// Check if a window matches our basic criteria
fn matches_window_criteria(d: &CFDictionary, pid: i32) -> bool {
    // Layer 0 = normal windows (not overlays or desktop)
    if dict_get_i32(d, "kCGWindowLayer") != Some(0) {
        return false;
    }

    if dict_get_i32(d, "kCGWindowOwnerPID") != Some(pid) {
        return false;
    }

    // Must be on-screen and visible
    if dict_get_bool(d, "kCGWindowIsOnscreen") != Some(true) {
        return false;
    }

    // Must have alpha > 0 (not fully transparent)
    if !dict_get_f64(d, "kCGWindowAlpha")
        .map(|a| a > 0.0)
        .unwrap_or(false)
    {
        return false;
    }

    return true;
}

/// Get the list of all on-screen windows
fn get_window_list() -> Option<CFArray<CFDictionary>> {
    unsafe {
        // Option flags: (1 << 0) = on-screen only, (1 << 4) = exclude desktop elements
        let arr = CGWindowListCopyWindowInfo((1 << 0) | (1 << 4), 0);

        if arr.is_null() {
            return None;
        }

        return Some(CFArray::<CFDictionary>::wrap_under_create_rule(
            arr as *const core_foundation::array::__CFArray,
        ));
    }
}

/// Extract an i32 value from a dictionary
fn dict_get_i32(d: &CFDictionary, key: &'static str) -> Option<i32> {
    unsafe {
        let k = CFString::from_static_string(key);
        let v = *d.get(k.as_concrete_TypeRef() as *const _);
        if v.is_null() {
            return None;
        }
        return CFNumber::wrap_under_get_rule(v as *const __CFNumber).to_i32();
    }
}

/// Extract a boolean value from a dictionary
fn dict_get_bool(d: &CFDictionary, key: &'static str) -> Option<bool> {
    unsafe {
        let k = CFString::from_static_string(key);
        let v = *d.get(k.as_concrete_TypeRef() as *const _);
        if v.is_null() {
            return None;
        }
        return Some((v as CFBooleanRef) == kCFBooleanTrue);
    }
}

/// Extract an f64 value from a dictionary
fn dict_get_f64(d: &CFDictionary, key: &'static str) -> Option<f64> {
    unsafe {
        let k = CFString::from_static_string(key);
        let v = *d.get(k.as_concrete_TypeRef() as *const _);
        if v.is_null() {
            return None;
        }
        return CFNumber::wrap_under_get_rule(v as *const __CFNumber).to_f64();
    }
}

/// Extract a string value from a dictionary
fn dict_get_string(d: &CFDictionary, key: &'static str) -> Option<String> {
    unsafe {
        let k = CFString::from_static_string(key);
        if !d.contains_key(&(k.as_concrete_TypeRef() as *const _)) {
            return None;
        }
        let v = *d.get(k.as_concrete_TypeRef() as *const _);
        if v.is_null() {
            return None;
        }
        if CFGetTypeID(v) != CFStringGetTypeID() {
            return None;
        }
        return Some(CFString::wrap_under_get_rule(v as CFStringRef).to_string());
    }
}

/// Extract window bounds from a dictionary
fn dict_get_bounds(d: &CFDictionary) -> Option<WindowBounds> {
    unsafe {
        let bounds_key = CFString::from_static_string("kCGWindowBounds");
        let ptr = *d.get(bounds_key.as_concrete_TypeRef() as *const _);
        if ptr.is_null() {
            return None;
        }
        let dict =
            CFDictionary::<CFString, CFNumber>::wrap_under_get_rule(ptr as *const __CFDictionary);

        let x = dict
            .get(CFString::from_static_string("X").as_concrete_TypeRef() as *const _)
            .to_f64();
        let y = dict
            .get(CFString::from_static_string("Y").as_concrete_TypeRef() as *const _)
            .to_f64();
        let w = dict
            .get(CFString::from_static_string("Width").as_concrete_TypeRef() as *const _)
            .to_f64();
        let h = dict
            .get(CFString::from_static_string("Height").as_concrete_TypeRef() as *const _)
            .to_f64();

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
}
