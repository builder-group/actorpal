use super::storage::ActivityStorage;
use super::types::{ActivityEntry, ActivitySummary, DailyStats};
use chrono::{Local, Timelike};
use std::collections::HashMap;

#[tauri::command]
#[specta::specta]
pub fn get_activity_entries() -> Result<Vec<ActivityEntry>, String> {
    let storage = ActivityStorage::load().map_err(|e| e.to_string())?;
    Ok(storage.entries)
}

#[tauri::command]
#[specta::specta]
pub fn get_today_stats() -> Result<DailyStats, String> {
    let storage = ActivityStorage::load().map_err(|e| e.to_string())?;

    let today = Local::now().format("%Y-%m-%d").to_string();
    let today_start = Local::now()
        .with_hour(0)
        .unwrap()
        .with_minute(0)
        .unwrap()
        .with_second(0)
        .unwrap()
        .timestamp() as u64;

    // Filter entries for today
    let today_entries: Vec<_> = storage
        .entries
        .iter()
        .filter(|e| e.start_time >= today_start)
        .collect();

    // Calculate total time and per-app summaries
    let mut app_durations: HashMap<String, u64> = HashMap::new();
    let mut total_time: u64 = 0;

    for entry in today_entries {
        let duration = entry.duration_seconds;
        *app_durations.entry(entry.application.clone()).or_insert(0) += duration;
        total_time += duration;
    }

    // Create summaries
    let mut activities: Vec<ActivitySummary> = app_durations
        .into_iter()
        .map(|(app, duration)| {
            let percentage = if total_time > 0 {
                (duration as f64 / total_time as f64) * 100.0
            } else {
                0.0
            };

            ActivitySummary {
                application: app,
                total_duration_seconds: duration,
                percentage,
            }
        })
        .collect();

    // Sort by duration (descending)
    activities.sort_by(|a, b| b.total_duration_seconds.cmp(&a.total_duration_seconds));

    Ok(DailyStats {
        date: today,
        total_time_seconds: total_time,
        activities,
    })
}

#[tauri::command]
#[specta::specta]
pub fn clear_tracking_data() -> Result<(), String> {
    let storage = ActivityStorage::default();
    storage.save().map_err(|e| e.to_string())?;
    Ok(())
}
