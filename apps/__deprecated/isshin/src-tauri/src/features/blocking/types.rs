use serde::{Deserialize, Serialize};

/// Blocking state for managing site and app blocking during focus sessions.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct BlockingState {
    /// Whether blocking is currently active
    pub is_active: bool,
    /// List of blocked site domains
    pub blocked_sites: Vec<String>,
    /// List of blocked application bundle IDs
    pub blocked_apps: Vec<String>,
}

impl Default for BlockingState {
    fn default() -> Self {
        Self {
            is_active: false,
            blocked_sites: Vec::new(),
            blocked_apps: Vec::new(),
        }
    }
}
