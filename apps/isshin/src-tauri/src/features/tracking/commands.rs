use super::storage::ActivityStorage;
use super::types::{ActivityEntry, ActivitySummary, DailyStats, WebsiteSummary};
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
    // Group by identifier (bundle_id if available, otherwise application name)
    let mut app_durations: HashMap<String, (String, Option<String>, u64)> = HashMap::new(); // (identifier, (display_name, bundle_id, duration))
    let mut website_durations: HashMap<String, u64> = HashMap::new();
    let mut total_time: u64 = 0;

    for entry in today_entries {
        let duration = entry.duration_seconds;
        let identifier = entry.identifier();

        // Use the most recent application name and bundle_id for display (in case it changed)
        app_durations
            .entry(identifier)
            .and_modify(|(_, _, d)| *d += duration)
            .or_insert((entry.application.clone(), entry.bundle_id.clone(), duration));

        // Extract domain from URL if present
        if let Some(ref url) = entry.url {
            if let Some(domain) = extract_domain(url) {
                *website_durations.entry(domain).or_insert(0) += duration;
            }
        }

        total_time += duration;
    }

    // Create app summaries
    let mut activities: Vec<ActivitySummary> = app_durations
        .into_iter()
        .map(|(_, (display_name, bundle_id, duration))| {
            let percentage = if total_time > 0 {
                (duration as f64 / total_time as f64) * 100.0
            } else {
                0.0
            };

            ActivitySummary {
                application: display_name,
                bundle_id,
                total_duration_seconds: duration,
                percentage,
            }
        })
        .collect();

    // Sort by duration (descending)
    activities.sort_by(|a, b| b.total_duration_seconds.cmp(&a.total_duration_seconds));

    // Create website summaries
    let mut websites: Vec<WebsiteSummary> = website_durations
        .into_iter()
        .map(|(domain, duration)| {
            let percentage = if total_time > 0 {
                (duration as f64 / total_time as f64) * 100.0
            } else {
                0.0
            };

            WebsiteSummary {
                domain,
                total_duration_seconds: duration,
                percentage,
            }
        })
        .collect();

    // Sort by duration (descending)
    websites.sort_by(|a, b| b.total_duration_seconds.cmp(&a.total_duration_seconds));

    Ok(DailyStats {
        date: today,
        total_time_seconds: total_time,
        activities,
        websites,
    })
}

fn extract_domain(url: &str) -> Option<String> {
    // Simple domain extraction - handles http://, https://, and www.
    let url = url.trim();

    if url.is_empty() {
        return None;
    }

    // Remove protocol
    let url = url
        .strip_prefix("http://")
        .or_else(|| url.strip_prefix("https://"))
        .unwrap_or(url);

    // Get domain part (before first /)
    let domain = url.split('/').next().unwrap_or(url);

    // Remove www. prefix
    let domain = domain.strip_prefix("www.").unwrap_or(domain);

    // Remove port if present
    let domain = domain.split(':').next().unwrap_or(domain);

    if domain.is_empty() {
        None
    } else {
        Some(domain.to_string())
    }
}

#[tauri::command]
#[specta::specta]
pub fn clear_tracking_data() -> Result<(), String> {
    let storage = ActivityStorage::default();
    storage.save().map_err(|e| e.to_string())?;
    Ok(())
}
