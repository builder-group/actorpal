use super::{app_info, window_event_handler::WindowEventHandler};
use crate::{
    error::Error, platform::macos::window_info::find_window_id_and_bounds, types::WindowEvent,
    WindowInfo,
};
use accessibility_sys::{
    kAXFocusedApplicationAttribute, kAXFocusedWindowAttribute, kAXFocusedWindowChangedNotification,
    kAXTitleAttribute, kAXTitleChangedNotification, AXObserverAddNotification, AXObserverCreate,
    AXObserverGetRunLoopSource, AXObserverRef, AXUIElementCreateApplication,
    AXUIElementCreateSystemWide, AXUIElementRef,
};
use core_foundation::{
    base::{CFType, TCFType},
    runloop::{kCFRunLoopDefaultMode, CFRunLoop, CFRunLoopSource},
    string::CFString,
};
use std::ffi;
use std::ptr;

/// Handle for managing an observer's lifecycle.
///
/// The observer itself is managed by Core Foundation. Removing the run loop source
/// automatically cleans up the observer and its context pointers.
struct ObserverHandle {
    run_loop_source: CFRunLoopSource,
}

/// Monitor for window changes using Accessibility API.
///
/// Monitors:
/// - Window focus changes (when user switches windows)
/// - Window title changes (to detect e.g. tab switches in browsers)
pub struct AccessibilityMonitor {
    observer: ObserverHandle,
}

impl AccessibilityMonitor {
    pub fn new(event_handler: WindowEventHandler, pid: i32) -> Result<Self, Error> {
        return Ok(Self {
            observer: Self::create_observer(&event_handler, pid)?,
        });
    }

    fn create_observer(
        event_handler: &WindowEventHandler,
        pid: i32,
    ) -> Result<ObserverHandle, Error> {
        let observer = unsafe {
            let mut observer = ptr::null_mut();
            let result = AXObserverCreate(pid, Self::window_change_callback, &mut observer);
            if result != 0 {
                return Err(Error::Platform(format!(
                    "Failed to create AX observer for PID {pid}: {result}"
                )));
            }
            observer
        };

        let app_element = unsafe { AXUIElementCreateApplication(pid) };

        // Register observers
        Self::register_focus_observer(observer, app_element, event_handler, pid)?;
        Self::register_title_observer(observer, app_element, event_handler)?;

        // Add observer's run loop source to current run loop
        let run_loop_source = unsafe { AXObserverGetRunLoopSource(observer) };
        let run_loop = CFRunLoop::get_current();
        let cf_source = unsafe { CFRunLoopSource::wrap_under_get_rule(run_loop_source) };
        unsafe {
            run_loop.add_source(&cf_source, kCFRunLoopDefaultMode);
        }

        return Ok(ObserverHandle {
            run_loop_source: cf_source,
        });
    }

    /// Callback for window focus/title changes (called by Accessibility API).
    ///
    /// SAFETY: This is a C callback invoked by the macOS Accessibility API.
    unsafe extern "C" fn window_change_callback(
        observer: AXObserverRef,
        element: AXUIElementRef,
        notification: core_foundation::string::CFStringRef,
        user_info: *mut ffi::c_void,
    ) {
        if user_info.is_null() || element.is_null() {
            return;
        }

        // Recover WindowEventHandler from user data pointer
        let event_handler = &*(user_info as *const WindowEventHandler);

        // Build WindowInfo
        let app_info = match app_info::get_current_app() {
            Some(app) => app,
            None => return,
        };
        let title =
            get_string_attribute(element, kAXTitleAttribute).or_else(get_current_window_title);
        let (window_id, bounds) =
            find_window_id_and_bounds(app_info.pid, title.as_deref().unwrap_or(""));
        let window_info = WindowInfo {
            title,
            window_id,
            bounds,
            app: app_info,
            browser: None,
        };

        // Skip invalid windows.
        //
        // When this occurs:
        // - Minimize/unminimize: Accessibility API fires callback but CoreGraphics window info isn't ready yet.
        //   -> If user unminimizes without switching focus, we won't fire a new event.
        //      This is acceptable because we track focus changes, not window visibility.
        if window_info.window_id.is_none() {
            eprintln!(
                "[AccessibilityMonitor] Skipping invalid window (PID {}, title: \"{:?}\")",
                window_info.app.pid, window_info.title
            );
            return;
        }

        let pid = window_info.app.pid;

        // Call user handler, catching panics (unwinding through C code is undefined behavior)
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            event_handler.handle(WindowEvent::WindowChanged {
                window: window_info,
            });
        }));
        if result.is_err() {
            eprintln!("[AccessibilityMonitor] Panic in user handler - event was dropped");
        }

        // Re-register title observer only on focus changes.
        // Title observer is registered on a specific window element,
        // so when focus changes to a different window,
        // we must re-register it on the new focused window.
        let notification_str = CFString::wrap_under_get_rule(notification);
        let focus_notification = CFString::from_static_string(kAXFocusedWindowChangedNotification);
        if notification_str.to_string() == focus_notification.to_string() {
            let app_element = unsafe { AXUIElementCreateApplication(pid) };
            let _ = Self::register_title_observer(observer, app_element, event_handler);
        }
    }

    /// Register observer for window focus change notifications.
    fn register_focus_observer(
        observer: AXObserverRef,
        app_element: AXUIElementRef,
        event_handler: &WindowEventHandler,
        pid: i32,
    ) -> Result<(), Error> {
        let notification = CFString::from_static_string(kAXFocusedWindowChangedNotification);
        let context_ptr = Box::into_raw(Box::new(event_handler.clone()));

        let result = unsafe {
            AXObserverAddNotification(
                observer,
                app_element,
                notification.as_concrete_TypeRef(),
                context_ptr.cast::<ffi::c_void>(),
            )
        };
        if result != 0 {
            unsafe {
                // Free memory: AX API only takes ownership on success, so we must free on failure
                let _ = Box::from_raw(context_ptr);
            }
            return Err(Error::Platform(format!(
                "Failed to add focus notification for PID {pid}: {result}"
            )));
        }

        return Ok(());
    }

    /// Register observer for window title change notifications.
    ///
    /// Returns `Ok(())` if no focused window is found (window may not be ready yet).
    fn register_title_observer(
        observer: AXObserverRef,
        app_element: AXUIElementRef,
        event_handler: &WindowEventHandler,
    ) -> Result<(), Error> {
        let window = match get_element_attribute(app_element, kAXFocusedWindowAttribute) {
            Some(window) => window,
            None => return Ok(()),
        };

        let notification = CFString::from_static_string(kAXTitleChangedNotification);
        let context_ptr = Box::into_raw(Box::new(event_handler.clone()));

        let result = unsafe {
            AXObserverAddNotification(
                observer,
                window,
                notification.as_concrete_TypeRef(),
                context_ptr.cast::<ffi::c_void>(),
            )
        };
        if result != 0 {
            unsafe {
                // Free memory: AX API only takes ownership on success, so we must free on failure
                let _ = Box::from_raw(context_ptr);
            }
            return Err(Error::Platform(format!(
                "Failed to add title notification: {result}"
            )));
        }

        return Ok(());
    }

    /// Stop observer (removing run loop source triggers AX API cleanup).
    pub fn stop(&mut self) -> Result<(), Error> {
        let run_loop = CFRunLoop::get_current();
        unsafe {
            run_loop.remove_source(&self.observer.run_loop_source, kCFRunLoopDefaultMode);
        }
        return Ok(());
    }
}

pub fn is_trusted() -> bool {
    return unsafe { accessibility_sys::AXIsProcessTrusted() };
}

/// Get title of the currently focused window.
pub fn get_current_window_title() -> Option<String> {
    let system = unsafe { AXUIElementCreateSystemWide() };
    return get_element_attribute(system, kAXFocusedApplicationAttribute)
        .and_then(|app| get_element_attribute(app, kAXFocusedWindowAttribute))
        .and_then(|window| get_string_attribute(window, kAXTitleAttribute));
}

/// Get string attribute from accessibility element.
///
/// Queries the AX API for a string attribute (e.g. window title) and returns it as a Rust String.
fn get_string_attribute(element: AXUIElementRef, attribute: &'static str) -> Option<String> {
    let mut value_ptr: *mut ffi::c_void = ptr::null_mut();
    let attr = CFString::from_static_string(attribute);

    let result = unsafe {
        accessibility_sys::AXUIElementCopyAttributeValue(
            element,
            attr.as_concrete_TypeRef(),
            std::ptr::from_mut::<*mut ffi::c_void>(&mut value_ptr).cast::<*const ffi::c_void>(),
        )
    };
    if result != 0 || value_ptr.is_null() {
        return None;
    }

    let cf_value = unsafe { CFType::wrap_under_create_rule(value_ptr) };
    return cf_value.downcast::<CFString>().map(|s| s.to_string());
}

/// Get element attribute from accessibility element.
///
/// Queries the AX API for an element attribute (e.g. focused window) and returns the element reference.
fn get_element_attribute(
    element: AXUIElementRef,
    attribute: &'static str,
) -> Option<AXUIElementRef> {
    let mut value_ptr: *mut ffi::c_void = ptr::null_mut();
    let attr = CFString::from_static_string(attribute);

    let result = unsafe {
        accessibility_sys::AXUIElementCopyAttributeValue(
            element,
            attr.as_concrete_TypeRef(),
            std::ptr::from_mut::<*mut ffi::c_void>(&mut value_ptr).cast::<*const ffi::c_void>(),
        )
    };
    if result != 0 || value_ptr.is_null() {
        return None;
    }

    return Some(value_ptr as accessibility_sys::AXUIElementRef);
}
