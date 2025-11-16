use super::types::ActivityEntry;
use sqlx::{FromRow, SqlitePool};

#[derive(Debug, FromRow)]
struct ActivityEntryRow {
    #[allow(dead_code)]
    id: i64,
    application: String,
    bundle_id: Option<String>,
    pid: Option<i32>,
    process_path: Option<String>,
    window_title: Option<String>,
    window_id: Option<i64>,
    window_x: Option<f64>,
    window_y: Option<f64>,
    window_width: Option<f64>,
    window_height: Option<f64>,
    browser_url: Option<String>,
    browser_is_private: Option<bool>,
    start_time: i64,
    end_time: i64,
    #[allow(dead_code)]
    created_at: String,
}

impl From<ActivityEntryRow> for ActivityEntry {
    fn from(row: ActivityEntryRow) -> Self {
        Self {
            application: row.application,
            bundle_id: row.bundle_id,
            pid: row.pid,
            process_path: row.process_path,
            window_title: row.window_title,
            window_id: row.window_id.map(|id| id as u32),
            window_x: row.window_x,
            window_y: row.window_y,
            window_width: row.window_width,
            window_height: row.window_height,
            browser_url: row.browser_url,
            browser_is_private: row.browser_is_private,
            start_time: row.start_time as u64,
            end_time: row.end_time as u64,
        }
    }
}

pub struct ActivityRepository;

impl ActivityRepository {
    /// Insert a new activity entry
    pub async fn insert(pool: &SqlitePool, entry: &ActivityEntry) -> Result<(), sqlx::Error> {
        // Skip entries with zero duration
        if entry.duration_seconds() == 0 {
            return Ok(());
        }

        sqlx::query(
            r#"
            INSERT INTO activity_entries (
                application, bundle_id, pid, process_path,
                window_title, window_id, window_x, window_y, window_width, window_height,
                browser_url, browser_is_private,
                start_time, end_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&entry.application)
        .bind(&entry.bundle_id)
        .bind(&entry.pid)
        .bind(&entry.process_path)
        .bind(&entry.window_title)
        .bind(entry.window_id.map(|id| id as i64))
        .bind(&entry.window_x)
        .bind(&entry.window_y)
        .bind(&entry.window_width)
        .bind(&entry.window_height)
        .bind(&entry.browser_url)
        .bind(&entry.browser_is_private)
        .bind(entry.start_time as i64)
        .bind(entry.end_time as i64)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Get all activity entries, ordered by start_time descending (newest first)
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<ActivityEntry>, sqlx::Error> {
        let rows = sqlx::query_as::<_, ActivityEntryRow>(
            r#"
            SELECT
                id,
                application,
                bundle_id,
                pid,
                process_path,
                window_title,
                window_id,
                window_x,
                window_y,
                window_width,
                window_height,
                browser_url,
                browser_is_private,
                start_time,
                end_time,
                created_at
            FROM activity_entries
            ORDER BY start_time DESC
            "#,
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(ActivityEntry::from).collect())
    }

    /// Delete all activity entries
    pub async fn delete_all(pool: &SqlitePool) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM activity_entries")
            .execute(pool)
            .await?;

        Ok(())
    }
}
