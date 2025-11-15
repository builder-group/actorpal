//! Accessibility API for window monitoring
//!
//! This module uses the macOS Accessibility API to:
//! 1. Monitor window focus changes (when user switches windows)
//! 2. Monitor window title changes (to detect tab switches in browsers)
//!
//! Observers are stored in a struct instead of global state.

use std::collections::HashMap;
use std::ffi;
use std::ptr;

use core_foundation::base::{CFType, TCFType};
use core_foundation::runloop::{kCFRunLoopDefaultMode, CFRunLoop, CFRunLoopSource};
use core_foundation::string::CFString;

use crate::error::Error;

use super::event_context::EventContext;
use super::window_info;
use super::workspace;

/// Observer information for a process
struct ObserverInfo {
    run_loop_source: CFRunLoopSource,
    // Observer itself is managed by Core Foundation, run loop source keeps it alive.
    // When the run loop source is removed, the observer and its associated context pointers
    // are cleaned up by the AX API automatically.
}

/// Monitor for window changes using Accessibility API
pub struct AccessibilityMonitor {
    context: EventContext,
    observers: HashMap<i32, ObserverInfo>,
}

impl AccessibilityMonitor {
    pub fn new(context: EventContext, pid: i32) -> Result<Self, Error> {
        let mut monitor = Self {
            context,
            observers: HashMap::new(),
        };

        monitor.create_for_app(pid)?;
        return Ok(monitor);
    }

    /// Create accessibility observer for an app
    fn create_for_app(&mut self, pid: i32) -> Result<(), Error> {
        // Clean up old observers (we only need one active observer per app)
        let run_loop = CFRunLoop::get_current();
        let old_pids: Vec<i32> = self.observers.keys().copied().collect();
        for old_pid in old_pids {
            if old_pid != pid {
                if let Some(old_info) = self.observers.remove(&old_pid) {
                    unsafe {
                        run_loop.remove_source(&old_info.run_loop_source, kCFRunLoopDefaultMode);
                    }
                }
            }
        }

        if self.observers.contains_key(&pid) {
            return Ok(()); // Already observing this app
        }

        return self.create_observer_internal(pid);
    }

    /// Internal helper to create an observer for a specific process
    ///
    /// SAFETY: This function uses multiple unsafe Accessibility API calls
    fn create_observer_internal(&mut self, pid: i32) -> Result<(), Error> {
        unsafe {
            use accessibility_sys::{
                AXObserverAddNotification, AXObserverCallback, AXObserverCreate,
                AXObserverGetRunLoopSource, AXUIElementCreateApplication,
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
            let notification = CFString::from_static_string(
                accessibility_sys::kAXFocusedWindowChangedNotification,
            );

            // Store context pointer - AX API keeps it alive for observer lifetime
            let context_ptr = Box::into_raw(Box::new(self.context.clone()));

            let result = AXObserverAddNotification(
                observer,
                app_element,
                notification.as_concrete_TypeRef(),
                context_ptr.cast::<ffi::c_void>(),
            );

            if result != 0 {
                let _ = Box::from_raw(context_ptr);
                return Err(Error::Platform(format!(
                    "Failed to add notification for PID {pid}: {result}"
                )));
            }

            // Also observe title changes for tab switching detection
            add_title_observer_to_focused_window(observer, app_element, &self.context);

            let run_loop_source = AXObserverGetRunLoopSource(observer);
            let run_loop = CFRunLoop::get_current();
            let cf_source = CFRunLoopSource::wrap_under_get_rule(run_loop_source);
            run_loop.add_source(&cf_source, kCFRunLoopDefaultMode);

            self.observers.insert(
                pid,
                ObserverInfo {
                    run_loop_source: cf_source,
                },
            );
        }
        return Ok(());
    }

    /// Stop all observers and clean up resources
    ///
    /// This removes all run loop sources, which causes the AX API to clean up
    /// the associated observers and their context pointers automatically.
    pub fn stop(&mut self) -> Result<(), Error> {
        let run_loop = CFRunLoop::get_current();
        for info in self.observers.values() {
            unsafe {
                run_loop.remove_source(&info.run_loop_source, kCFRunLoopDefaultMode);
            }
        }
        // Clearing the map ensures we don't try to remove sources twice
        // The AX API handles cleanup of observers and context pointers when sources are removed
        self.observers.clear();
        return Ok(());
    }
}

/// Check if accessibility permissions are granted
pub fn is_trusted() -> bool {
    return unsafe { accessibility_sys::AXIsProcessTrusted() };
}

/// Get the title of the currently focused window
pub fn get_window_title(_pid: i32) -> Option<String> {
    unsafe {
        let system = accessibility_sys::AXUIElementCreateSystemWide();
        return get_element_attribute(system, accessibility_sys::kAXFocusedApplicationAttribute)
            .and_then(|app| {
                get_element_attribute(app, accessibility_sys::kAXFocusedWindowAttribute)
            })
            .and_then(|window| get_string_attribute(window, accessibility_sys::kAXTitleAttribute));
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
    context: &EventContext,
) {
    use accessibility_sys::kAXFocusedWindowAttribute;

    if let Some(window) = get_element_attribute(app_element, kAXFocusedWindowAttribute) {
        let notification =
            CFString::from_static_string(accessibility_sys::kAXTitleChangedNotification);

        // Store context pointer - observer keeps it alive
        let context_ptr = Box::into_raw(Box::new(context.clone()));

        let result = accessibility_sys::AXObserverAddNotification(
            observer,
            window,
            notification.as_concrete_TypeRef(),
            context_ptr.cast::<ffi::c_void>(),
        );

        if result != 0 {
            // If result is -25209 (kAXErrorNotificationAlreadyRegistered), the observer
            // is already attached to this window, which is fine - free the context pointer.
            // For other errors, we just won't get title change notifications (acceptable).
            let _ = Box::from_raw(context_ptr);
        }
        // If result == 0, the context pointer is intentionally "leaked" - the AX API
        // keeps it alive for the observer's lifetime and will free it when the observer is removed
    }
}

/// Callback for window focus and title changes
///
/// This is called by the Accessibility API when:
/// 1. The focused window changes (kAXFocusedWindowChangedNotification)
/// 2. The window title changes (kAXTitleChangedNotification) - for tab switching
///
/// SAFETY: This is a C callback invoked by the Accessibility API.
/// We use catch_unwind to prevent panics from crashing the app.
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

    // Recover our EventContext from the pointer we stored when registering the observer
    let context = &*(user_info as *const EventContext);

    // Get title from element (could be window or app element depending on notification type)
    let title = get_string_attribute(element, kAXTitleAttribute);

    if let Some(pid) = workspace::get_current_pid() {
        // Build window info from what we have
        let title = title.unwrap_or_default();
        if !title.is_empty() {
            if let Some(window) = window_info::build_window_info(pid, title, None) {
                if window.window_id != 0 {
                    // Re-add title observer when window is ready (e.g., after unminimizing)
                    // The API returns -25209 if already registered, which we handle by freeing the callback data pointer
                    let app_element = accessibility_sys::AXUIElementCreateApplication(pid);
                    add_title_observer_to_focused_window(observer, app_element, context);

                    // Wrap user code in catch_unwind to prevent panics from crashing the app
                    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        context.handle(window);
                    }));

                    // Log panic if it occurred, but don't crash the app
                    if let Err(_) = result {
                        eprintln!(
                            "[AccessibilityMonitor] Panic in user handler - event was dropped"
                        );
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
        return cf_value.downcast::<CFString>().map(|s| s.to_string());
    } else {
        return None;
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
        return Some(value_ptr as accessibility_sys::AXUIElementRef);
    } else {
        return None;
    }
}
