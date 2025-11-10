use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ActivityEntry {
    pub application: String,       // Display name (e.g., "Google Chrome")
    pub bundle_id: Option<String>, // Unique identifier (e.g., "com.google.Chrome")
    pub window_title: Option<String>,
    pub url: Option<String>,
    pub start_time: u64,
    pub end_time: u64,
    pub duration_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ActivitySummary {
    pub application: String,
    pub bundle_id: Option<String>,
    pub total_duration_seconds: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct WebsiteSummary {
    pub domain: String,
    pub total_duration_seconds: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DailyStats {
    pub date: String,
    pub total_time_seconds: u64,
    pub activities: Vec<ActivitySummary>,
    pub websites: Vec<WebsiteSummary>,
}

impl ActivityEntry {
    pub fn new(
        application: String,
        bundle_id: Option<String>,
        window_title: Option<String>,
        url: Option<String>,
    ) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Self {
            application,
            bundle_id,
            window_title,
            url,
            start_time: now,
            end_time: now,
            duration_seconds: 0,
        }
    }

    // Get the identifier for this activity (bundle_id if available, otherwise application name)
    pub fn identifier(&self) -> String {
        self.bundle_id
            .as_ref()
            .map(|bid| bid.clone())
            .unwrap_or_else(|| self.application.clone())
    }

    pub fn update_end_time(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        self.end_time = now;
        self.duration_seconds = now - self.start_time;
    }
}
