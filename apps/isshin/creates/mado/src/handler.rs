//! Event handler trait for window monitoring

use crate::types::WindowInfo;

/// Trait for handling window and app focus events
///
/// Implement this trait to receive notifications when focus changes.
/// The callback receives complete window information including app details.
/// You can check if the app changed by comparing `window.app.bundle_id` with your last known value.
///
/// # Example
///
/// ```rust
/// struct MyHandler {
///     last_bundle_id: Option<String>,
/// }
///
/// impl EventHandler for MyHandler {
///     fn on_focus_change(&self, window: WindowInfo) {
///         let app_changed = self.last_bundle_id.as_deref() != Some(&window.app.bundle_id);
///         
///         if app_changed {
///             println!("Switched to app: {}", window.app.name);
///         }
///         println!("Window: {}", window.title);
///     }
/// }
/// ```
pub trait EventHandler: Send + Sync {
    /// Called whenever the focused window changes
    ///
    /// This includes:
    /// - App switches (check `window.app.bundle_id` to detect)
    /// - Window switches within the same app
    /// - Tab switches in browsers
    /// - Window title changes
    ///
    /// The `WindowInfo` includes complete app information, so you can detect
    /// app switches by tracking the `bundle_id` yourself if needed.
    fn on_focus_change(&self, window: WindowInfo);
}
