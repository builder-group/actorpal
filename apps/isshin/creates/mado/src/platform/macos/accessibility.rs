//! Accessibility API for window monitoring
//!
//! This module uses the macOS Accessibility API to:
//! 1. Monitor window focus changes (when user switches windows)
//! 2. Monitor window title changes (to detect tab switches in browsers)
//!
//! ## Why Unsafe?
//!
//! The Accessibility API is a C API that requires:
//! - Raw pointers and C callbacks
//! - Manual memory management
//! - FFI calls
//!
//! We encapsulate all unsafe code and provide safe public interfaces.

use std::collections::HashMap;
use std::ffi;
use std::ptr;
use std::sync::{Arc, RwLock};

use core_foundation::base::{CFType, TCFType};
use core_foundation::runloop::{kCFRunLoopDefaultMode, CFRunLoop, CFRunLoopSource};
use core_foundation::string::CFString;

use crate::error::Error;
use crate::handler::EventHandler;
use crate::types::WindowBounds;

use super::global_state;
use super::window_info;

/// Observer information for a process
struct ObserverInfo {
    run_loop_source: CFRunLoopSource,
    // Observer itself is managed by Core Foundation, run loop source keeps it alive
}

/// Active observers by PID
///
/// SAFETY: Only accessed from the main thread where the run loop executes.
/// Observers are added when apps are activated and removed when cleaning up.
static mut OBSERVERS: Option<HashMap<i32, ObserverInfo>> = None;

/// Check if accessibility permissions are granted
pub fn is_trusted() -> bool {
    unsafe { accessibility_sys::AXIsProcessTrusted() }
}

/// Get the title of the currently focused window
pub fn get_window_title(_pid: i32) -> Option<String> {
    unsafe {
        let system = accessibility_sys::AXUIElementCreateSystemWide();
        get_element_attribute(system, accessibility_sys::kAXFocusedApplicationAttribute)
            .and_then(|app| {
                get_element_attribute(app, accessibility_sys::kAXFocusedWindowAttribute)
            })
            .and_then(|window| get_string_attribute(window, accessibility_sys::kAXTitleAttribute))
    }
}

/// Get the bounds of the focused window for a given PID
pub fn get_window_bounds(pid: i32) -> Option<WindowBounds> {
    unsafe {
        let app_element = accessibility_sys::AXUIElementCreateApplication(pid);
        let window_element =
            get_element_attribute(app_element, accessibility_sys::kAXFocusedWindowAttribute)?;

        let pos = get_value_attribute(window_element, accessibility_sys::kAXPositionAttribute)?;
        let size = get_value_attribute(window_element, accessibility_sys::kAXSizeAttribute)?;

        if accessibility_sys::AXValueGetType(pos) != accessibility_sys::kAXValueTypeCGPoint
            || accessibility_sys::AXValueGetType(size) != accessibility_sys::kAXValueTypeCGSize
        {
            return None;
        }

        #[repr(C)]
        struct CGPoint {
            x: f64,
            y: f64,
        }
        #[repr(C)]
        struct CGSize {
            width: f64,
            height: f64,
        }

        let mut point = CGPoint { x: 0.0, y: 0.0 };
        let mut size_val = CGSize {
            width: 0.0,
            height: 0.0,
        };

        if accessibility_sys::AXValueGetValue(
            pos,
            accessibility_sys::kAXValueTypeCGPoint,
            &mut point as *mut _ as *mut ffi::c_void,
        ) && accessibility_sys::AXValueGetValue(
            size,
            accessibility_sys::kAXValueTypeCGSize,
            &mut size_val as *mut _ as *mut ffi::c_void,
        ) {
            Some(WindowBounds {
                x: point.x,
                y: point.y,
                width: size_val.width,
                height: size_val.height,
            })
        } else {
            None
        }
    }
}

/// Monitor for window changes using Accessibility API
pub struct AccessibilityMonitor {
    // Note: handler is stored in global_state, not here
    // We keep this struct for API consistency
}

impl AccessibilityMonitor {
    pub fn new(
        _handler: Arc<RwLock<dyn EventHandler>>,
        _config: crate::config::MonitorConfig,
    ) -> Self {
        Self {}
    }

    pub fn start(&self) -> Result<(), Error> {
        unsafe {
            let ptr = std::ptr::addr_of_mut!(OBSERVERS);
            *ptr = Some(HashMap::new());
        }

        // Create observer for current app
        if let Some(pid) = super::workspace::get_current_pid() {
            Self::create_for_app(pid)?;
        }

        Ok(())
    }

    /// Create accessibility observer for an app
    ///
    /// This is called when:
    /// 1. The monitor starts (for the initial app)
    /// 2. The user switches to a different app
    pub fn create_for_app(pid: i32) -> Result<(), Error> {
        let handler = global_state::get_handler()
            .ok_or_else(|| Error::Platform("Handler not initialized".to_string()))?;

        unsafe {
            let observers_ptr = std::ptr::addr_of_mut!(OBSERVERS);

            // Clean up old observers (we only need one active observer per app)
            if let Some(observers) = (*observers_ptr).as_mut() {
                let run_loop = CFRunLoop::get_current();
                let old_pids: Vec<i32> = observers.keys().copied().collect();
                for old_pid in old_pids {
                    if old_pid != pid {
                        if let Some(old_info) = observers.remove(&old_pid) {
                            run_loop
                                .remove_source(&old_info.run_loop_source, kCFRunLoopDefaultMode);
                        }
                    }
                }
            }

            if let Some(observers) = (*observers_ptr).as_ref() {
                if observers.contains_key(&pid) {
                    return Ok(()); // Already observing this app
                }
            }

            Self::create_observer_internal(pid, handler)
        }
    }

    /// Internal helper to create an observer for a specific process
    ///
    /// SAFETY: This function uses multiple unsafe Accessibility API calls
    fn create_observer_internal(
        pid: i32,
        handler: Arc<RwLock<dyn EventHandler>>,
    ) -> Result<(), Error> {
        unsafe {
            use accessibility_sys::{
                kAXFocusedWindowChangedNotification, AXObserverAddNotification, AXObserverCallback,
                AXObserverCreate, AXObserverGetRunLoopSource, AXUIElementCreateApplication,
            };

            let mut observer = ptr::null_mut();
            let result = AXObserverCreate(
                pid,
                window_change_callback as AXObserverCallback,
                &mut observer,
            );
            if result != 0 {
                return Err(Error::Platform(format!(
                    "Failed to create AX observer for PID {pid}: {result}"
                )));
            }

            // Create app element for this PID
            let app_element = AXUIElementCreateApplication(pid);
            let notification = CFString::from_static_string(kAXFocusedWindowChangedNotification);

            // Intentionally "leak" handler pointer - AX API keeps it alive for observer lifetime
            // AX API doesn't provide a way to free user_info when observer is removed
            let handler_ptr = Box::into_raw(Box::new(handler.clone()));

            let result = AXObserverAddNotification(
                observer,
                app_element,
                notification.as_concrete_TypeRef(),
                handler_ptr.cast::<ffi::c_void>(),
            );

            if result != 0 {
                let _ = Box::from_raw(handler_ptr);
                return Err(Error::Platform(format!(
                    "Failed to add notification for PID {pid}: {result}"
                )));
            }

            // Also observe title changes for tab switching detection
            add_title_observer_to_focused_window(observer, app_element, &handler);

            let run_loop_source = AXObserverGetRunLoopSource(observer);
            let run_loop = CFRunLoop::get_current();
            let cf_source = CFRunLoopSource::wrap_under_get_rule(run_loop_source);
            run_loop.add_source(&cf_source, kCFRunLoopDefaultMode);

            let observers_ptr = std::ptr::addr_of_mut!(OBSERVERS);
            if let Some(observers) = (*observers_ptr).as_mut() {
                observers.insert(
                    pid,
                    ObserverInfo {
                        run_loop_source: cf_source,
                    },
                );
            }
        }
        Ok(())
    }

    pub fn stop() -> Result<(), Error> {
        unsafe {
            let observers_ptr = std::ptr::addr_of_mut!(OBSERVERS);
            if let Some(observers) = (*observers_ptr).as_mut() {
                let run_loop = CFRunLoop::get_current();
                for info in observers.values() {
                    run_loop.remove_source(&info.run_loop_source, kCFRunLoopDefaultMode);
                }
                observers.clear();
            }
            *observers_ptr = None;
        }
        Ok(())
    }
}

/// Add title change observer to the currently focused window
///
/// This enables detection of tab switches in browsers (title changes without window changes)
///
/// SAFETY: Uses AX API to add a notification observer
unsafe fn add_title_observer_to_focused_window(
    observer: accessibility_sys::AXObserverRef,
    app_element: accessibility_sys::AXUIElementRef,
    handler: &Arc<RwLock<dyn EventHandler>>,
) {
    use accessibility_sys::{kAXFocusedWindowAttribute, kAXTitleChangedNotification};

    if let Some(window) = get_element_attribute(app_element, kAXFocusedWindowAttribute) {
        let notification = CFString::from_static_string(kAXTitleChangedNotification);

        // Intentionally "leak" handler pointer - observer keeps it alive
        let handler_ptr = Box::into_raw(Box::new(handler.clone()));

        let result = accessibility_sys::AXObserverAddNotification(
            observer,
            window,
            notification.as_concrete_TypeRef(),
            handler_ptr.cast::<ffi::c_void>(),
        );

        if result != 0 {
            // If result is -25209 (kAXErrorNotificationAlreadyRegistered), the observer
            // is already attached to this window, which is fine - free the handler pointer.
            // For other errors, we just won't get title change notifications (acceptable).
            let _ = Box::from_raw(handler_ptr);
        }
        // If result == 0, the handler pointer is intentionally "leaked" - the AX API
        // keeps it alive for the observer's lifetime and will free it when the observer is removed
    }
}

/// Callback for window focus and title changes
///
/// This is called by the Accessibility API when:
/// 1. The focused window changes (kAXFocusedWindowChangedNotification)
/// 2. The window title changes (kAXTitleChangedNotification) - for tab switching
///
/// SAFETY: This is a C callback invoked by the Accessibility API
unsafe extern "C" fn window_change_callback(
    observer: accessibility_sys::AXObserverRef,
    element: accessibility_sys::AXUIElementRef,
    _notification: core_foundation::string::CFStringRef,
    user_info: *mut ffi::c_void,
) {
    use accessibility_sys::kAXTitleAttribute;

    if user_info.is_null() || element.is_null() {
        return;
    }

    let handler = &*(user_info as *const Arc<RwLock<dyn EventHandler>>);

    // Get title from element (could be window or app element depending on notification type)
    let title = get_string_attribute(element, kAXTitleAttribute);
    let window_title = title.or_else(|| window_info::get_current_window().map(|w| w.title));

    if let Some(title) = window_title {
        if !title.is_empty() {
            if let Some(window) = window_info::get_current_window() {
                if window.window_id != 0 {
                    // Re-add title observer when window is ready (e.g., after unminimizing)
                    // The API returns -25209 if already registered, which we handle by freeing the handler pointer
                    if let Some(pid) = super::workspace::get_current_pid() {
                        let app_element = accessibility_sys::AXUIElementCreateApplication(pid);
                        add_title_observer_to_focused_window(observer, app_element, handler);
                    }

                    if let Ok(guard) = handler.read() {
                        guard.on_focus_change(window);
                    }
                }
            }
        }
    }
}

/// Get a string attribute from an accessibility element
unsafe fn get_string_attribute(
    element: accessibility_sys::AXUIElementRef,
    attribute: &'static str,
) -> Option<String> {
    let mut value_ptr: *mut ffi::c_void = ptr::null_mut();
    let attr = CFString::from_static_string(attribute);

    let result = accessibility_sys::AXUIElementCopyAttributeValue(
        element,
        attr.as_concrete_TypeRef(),
        std::ptr::from_mut::<*mut ffi::c_void>(&mut value_ptr).cast::<*const ffi::c_void>(),
    );

    if result == 0 && !value_ptr.is_null() {
        let cf_value = CFType::wrap_under_create_rule(value_ptr);
        cf_value.downcast::<CFString>().map(|s| s.to_string())
    } else {
        None
    }
}

/// Get an element attribute from an accessibility element
unsafe fn get_element_attribute(
    element: accessibility_sys::AXUIElementRef,
    attribute: &'static str,
) -> Option<accessibility_sys::AXUIElementRef> {
    let mut value_ptr: *mut ffi::c_void = ptr::null_mut();
    let attr = CFString::from_static_string(attribute);

    let result = accessibility_sys::AXUIElementCopyAttributeValue(
        element,
        attr.as_concrete_TypeRef(),
        std::ptr::from_mut::<*mut ffi::c_void>(&mut value_ptr).cast::<*const ffi::c_void>(),
    );

    if result == 0 && !value_ptr.is_null() {
        Some(value_ptr as accessibility_sys::AXUIElementRef)
    } else {
        None
    }
}

/// Get a value attribute (for position, size, etc.)
unsafe fn get_value_attribute(
    element: accessibility_sys::AXUIElementRef,
    attribute: &'static str,
) -> Option<accessibility_sys::AXValueRef> {
    let mut value_ptr: *mut ffi::c_void = ptr::null_mut();
    let attr = CFString::from_static_string(attribute);

    let result = accessibility_sys::AXUIElementCopyAttributeValue(
        element,
        attr.as_concrete_TypeRef(),
        std::ptr::from_mut::<*mut ffi::c_void>(&mut value_ptr).cast::<*const ffi::c_void>(),
    );

    if result == 0 && !value_ptr.is_null() {
        Some(value_ptr as accessibility_sys::AXValueRef)
    } else {
        None
    }
}
