use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ActivityEntry {
    pub application: String,
    pub window_title: Option<String>,
    pub start_time: u64,
    pub end_time: u64,
    pub duration_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ActivitySummary {
    pub application: String,
    pub total_duration_seconds: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DailyStats {
    pub date: String,
    pub total_time_seconds: u64,
    pub activities: Vec<ActivitySummary>,
}

impl ActivityEntry {
    pub fn new(application: String, window_title: Option<String>) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Self {
            application,
            window_title,
            start_time: now,
            end_time: now,
            duration_seconds: 0,
        }
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
