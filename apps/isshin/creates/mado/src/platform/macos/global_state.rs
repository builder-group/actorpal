//! Centralized global state management for macOS monitors
//!
//! ## Why Global State?
//!
//! macOS APIs (NSWorkspace notifications and Accessibility observers) require C-style callbacks
//! that cannot capture Rust closures. We must use global state to bridge the gap between
//! Objective-C callbacks and Rust.
//!
//! ## Safety
//!
//! - All global state is marked `unsafe` and accessed only through safe wrapper functions
//! - The state is only accessed on the main thread (where CFRunLoop runs)
//! - The state is initialized before callbacks can fire and cleaned up after stopping
//! - We use `Arc<RwLock<>>` for thread-safe access to the handler

use std::sync::{Arc, RwLock};

use core_foundation::runloop::CFRunLoop;

use crate::handler::EventHandler;

/// Global handler for events
///
/// SAFETY: This is accessed only from CFRunLoop callbacks on the main thread.
/// It's set before any callbacks can fire and cleared when monitoring stops.
static mut GLOBAL_HANDLER: Option<Arc<RwLock<dyn EventHandler>>> = None;

/// Current CFRunLoop instance for stopping the monitor
///
/// SAFETY: Only accessed on the main thread. Set when run() is called,
/// cleared when the run loop exits.
static mut CURRENT_RUN_LOOP: Option<CFRunLoop> = None;

/// Set the global event handler
///
/// Must be called before starting any monitors and only from the main thread.
pub(super) fn set_handler(handler: Arc<RwLock<dyn EventHandler>>) {
    unsafe {
        let ptr = std::ptr::addr_of_mut!(GLOBAL_HANDLER);
        *ptr = Some(handler);
    }
}

/// Get a reference to the global handler
///
/// Only call this from callbacks after the handler has been set.
pub(super) fn get_handler() -> Option<Arc<RwLock<dyn EventHandler>>> {
    unsafe {
        let ptr = std::ptr::addr_of!(GLOBAL_HANDLER);
        (*ptr).clone()
    }
}

/// Set the current run loop
///
/// Must be called only from the thread running the CFRunLoop.
pub(super) fn set_run_loop(run_loop: CFRunLoop) {
    unsafe {
        let ptr = std::ptr::addr_of_mut!(CURRENT_RUN_LOOP);
        *ptr = Some(run_loop);
    }
}

/// Stop the run loop
///
/// Can be called from any thread. The run loop will stop gracefully.
pub(super) fn stop_run_loop() {
    unsafe {
        let ptr = std::ptr::addr_of!(CURRENT_RUN_LOOP);
        if let Some(ref run_loop) = *ptr {
            run_loop.stop();
        }
    }
}

/// Clear all global state
///
/// Must be called after the run loop has stopped to prevent callbacks
/// from accessing freed memory.
pub(super) fn clear_all() {
    unsafe {
        let handler_ptr = std::ptr::addr_of_mut!(GLOBAL_HANDLER);
        let runloop_ptr = std::ptr::addr_of_mut!(CURRENT_RUN_LOOP);
        *handler_ptr = None;
        *runloop_ptr = None;
    }
}
