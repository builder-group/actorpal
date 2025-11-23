use crate::types::WindowEvent;

/// Trait for listening to window and app focus events.
///
/// Implement this trait to receive notifications when focus changes.
/// The callback receives a `WindowEvent` which can be either:
/// - `AppActivated`: Always fires when an app is switched to (even if it has no window yet, e.g. tray apps)
/// - `WindowChanged`: Fires when window focus/title changes or when a window becomes available
///
/// # Example
///
/// ```rust
/// use mado::{WindowEvent, WindowListener};
///
/// struct MyListener;
///
/// impl WindowListener for MyListener {
///     fn on_focus_change(&self, event: WindowEvent) {
///         match event {
///             WindowEvent::AppActivated { app } => {
///                 println!("App activated: {}", app.name);
///             }
///             WindowEvent::WindowChanged { window } => {
///                 println!("Window changed: {} in {}", window.title, window.app.name);
///             }
///         }
///     }
/// }
/// ```
pub trait WindowListener: Send + Sync {
    /// Called whenever the focused window or app changes.
    ///
    /// Focus can change to:
    /// - An app (`AppActivated` event) - fires immediately when app is activated, even if it has no window yet
    ///   (e.g. tray apps, apps activated via Spotlight/Dock before opening a window)
    /// - A window (`WindowChanged` event) - fires when window focus/title changes or when window becomes available
    ///
    /// This includes:
    /// - App switches (always `AppActivated` first, then `WindowChanged` when window is ready)
    /// - Window switches within the same app (`WindowChanged` only)
    /// - Tab switches in browsers (`WindowChanged` only)
    /// - Window title changes (`WindowChanged` only)
    ///
    /// Use `event.app()` to get app information from either event type.
    fn on_focus_change(&self, event: WindowEvent);
}
