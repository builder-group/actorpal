//! CoreGraphics helpers for window information
//!
//! This module uses CoreGraphics API to:
//! - Query the window list
//! - Find window IDs (stable identifiers for windows)
//! - Extract window metadata (layer, owner PID, visibility, etc.)
//!
//! ## Why Unsafe?
//!
//! CoreGraphics is a C API that requires:
//! - FFI calls to system frameworks
//! - Manual memory management of CoreFoundation types
//! - Raw pointer handling
//!
//! ## Window Matching
//!
//! We match windows by filtering on multiple criteria:
//! - Layer 0 (normal windows, not overlays)
//! - On-screen visibility
//! - Alpha > 0 (not fully transparent)
//! - Matching PID
//! - Optionally matching title

use std::ffi;

use core_foundation::array::CFArray;
use core_foundation::base::{CFGetTypeID, TCFType};
use core_foundation::boolean::{kCFBooleanTrue, CFBooleanRef};
use core_foundation::dictionary::{CFDictionary, __CFDictionary};
use core_foundation::number::CFNumber;
use core_foundation::number::__CFNumber;
use core_foundation::string::{CFString, CFStringGetTypeID, CFStringRef};

use crate::types::WindowBounds;

// Link to CoreGraphics framework
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    /// Copy the window list
    ///
    /// Parameters:
    /// - option: Bitmask controlling which windows to include
    /// - relativeToWindow: Window ID to use as reference (0 = all windows)
    ///
    /// Returns: CFArray of CFDictionary objects (one per window)
    fn CGWindowListCopyWindowInfo(option: u32, relativeToWindow: u32) -> *mut ffi::c_void;
}

/// Find window ID and bounds by matching PID and optionally title
///
/// This function queries all on-screen windows and finds the one matching
/// the given criteria. Window IDs from CoreGraphics are stable and can be
/// used for tracking specific windows over time.
///
/// Returns: (window_id, bounds)
pub fn find_window_info(pid: i32, title: &str) -> Option<(u32, WindowBounds)> {
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

    None
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
    if dict_get_f64(d, "kCGWindowAlpha")
        .map(|a| a > 0.0)
        .unwrap_or(false)
        == false
    {
        return false;
    }

    true
}

/// Get the list of all on-screen windows
fn get_window_list() -> Option<CFArray<CFDictionary>> {
    unsafe {
        // Option flags: (1 << 0) = on-screen only, (1 << 4) = exclude desktop elements
        // CGWindowListCopyWindowInfo returns a retained object (Copy = caller owns it)
        let arr = CGWindowListCopyWindowInfo((1 << 0) | (1 << 4), 0);

        if arr.is_null() {
            return None;
        }

        // Use wrap_under_create_rule to take ownership - will be released when dropped
        Some(CFArray::<CFDictionary>::wrap_under_create_rule(
            arr as *const core_foundation::array::__CFArray,
        ))
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
        CFNumber::wrap_under_get_rule(v as *const __CFNumber).to_i32()
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
        // In CoreFoundation, booleans are singletons - we can compare pointers
        Some((v as CFBooleanRef) == kCFBooleanTrue)
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
        CFNumber::wrap_under_get_rule(v as *const __CFNumber).to_f64()
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
        Some(CFString::wrap_under_get_rule(v as CFStringRef).to_string())
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

        match (x, y, w, h) {
            (Some(x), Some(y), Some(w), Some(h)) => Some(WindowBounds {
                x,
                y,
                width: w,
                height: h,
            }),
            _ => None,
        }
    }
}
