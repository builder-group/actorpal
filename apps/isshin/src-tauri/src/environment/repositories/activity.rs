use crate::features::tracking::types::ActivityEntry;
use sqlx::{FromRow, SqlitePool};

#[derive(Debug, FromRow)]
struct ActivityEntryRow {
    id: i64,
    application: String,
    bundle_id: Option<String>,
    window_title: Option<String>,
    url: Option<String>,
    start_time: i64,
    end_time: i64,
    duration_seconds: i64,
    #[allow(dead_code)]
    created_at: String,
}

impl From<ActivityEntryRow> for ActivityEntry {
    fn from(row: ActivityEntryRow) -> Self {
        ActivityEntry {
            application: row.application,
            bundle_id: row.bundle_id,
            window_title: row.window_title,
            url: row.url,
            start_time: row.start_time as u64,
            end_time: row.end_time as u64,
            duration_seconds: row.duration_seconds as u64,
        }
    }
}

pub struct ActivityRepository;

impl ActivityRepository {
    /// Insert a new activity entry into the database
    pub async fn insert(
        pool: &SqlitePool,
        entry: &ActivityEntry,
    ) -> Result<(), sqlx::Error> {
        if entry.duration_seconds > 0 {
            sqlx::query(
                r#"
                INSERT INTO activity_entries (
                    application, bundle_id, window_title, url,
                    start_time, end_time, duration_seconds
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&entry.application)
            .bind(&entry.bundle_id)
            .bind(&entry.window_title)
            .bind(&entry.url)
            .bind(entry.start_time as i64)
            .bind(entry.end_time as i64)
            .bind(entry.duration_seconds as i64)
            .execute(pool)
            .await?;
        }
        Ok(())
    }

    /// Get all activity entries, ordered by start_time descending
    pub async fn get_all(pool: &SqlitePool) -> Result<Vec<ActivityEntry>, sqlx::Error> {
        let rows = sqlx::query_as::<_, ActivityEntryRow>(
            r#"
            SELECT id, application, bundle_id, window_title, url,
                   start_time, end_time, duration_seconds, created_at
            FROM activity_entries
            ORDER BY start_time DESC
            "#,
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(ActivityEntry::from).collect())
    }

    /// Get activity entries since a given timestamp
    pub async fn get_since(
        pool: &SqlitePool,
        since_timestamp: u64,
    ) -> Result<Vec<ActivityEntry>, sqlx::Error> {
        let rows = sqlx::query_as::<_, ActivityEntryRow>(
            r#"
            SELECT id, application, bundle_id, window_title, url,
                   start_time, end_time, duration_seconds, created_at
            FROM activity_entries
            WHERE start_time >= ?
            ORDER BY start_time ASC
            "#,
        )
        .bind(since_timestamp as i64)
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

