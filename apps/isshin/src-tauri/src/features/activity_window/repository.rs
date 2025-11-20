use super::types::{App, AppActivity, WindowActivity};
use crate::common::time::current_timestamp;
use mado::WindowInfo;
use sqlx::{Error, SqlitePool};

// =============================================================================
// App Repository
// =============================================================================

pub struct AppRepository;

impl AppRepository {
    /// Get app_id by bundle_id, or None if not found.
    pub async fn get_id_by_bundle_id(
        pool: &SqlitePool,
        bundle_id: &str,
    ) -> Result<Option<i64>, Error> {
        let id = sqlx::query_scalar("SELECT id FROM apps WHERE bundle_id = ?")
            .bind(bundle_id)
            .fetch_optional(pool)
            .await?;

        return Ok(id);
    }

    /// Upsert app (insert or update if exists by bundle_id).
    pub async fn upsert(pool: &SqlitePool, app: &UpsertAppInput) -> Result<i64, Error> {
        let now = current_timestamp();

        // Try to find existing app by bundle_id
        let existing: Option<i64> = sqlx::query_scalar("SELECT id FROM apps WHERE bundle_id = ?")
            .bind(&app.bundle_id)
            .fetch_optional(pool)
            .await?;

        // Update existing app
        if let Some(id) = existing {
            sqlx::query(
                "UPDATE apps SET name = ?, process_path = ?, last_seen_at = ? WHERE id = ?",
            )
            .bind(&app.name)
            .bind(&app.process_path)
            .bind(now)
            .bind(id)
            .execute(pool)
            .await?;

            return Ok(id);
        }
        // Insert new app
        else {
            let id = sqlx::query_scalar(
                "INSERT INTO apps (bundle_id, name, process_path, first_seen_at, last_seen_at) 
                 VALUES (?, ?, ?, ?, ?) 
                 RETURNING id",
            )
            .bind(&app.bundle_id)
            .bind(&app.name)
            .bind(&app.process_path)
            .bind(now)
            .bind(now)
            .fetch_one(pool)
            .await?;

            return Ok(id);
        }
    }
}

#[derive(Debug, Clone)]
pub struct UpsertAppInput {
    pub bundle_id: String,
    pub name: String,
    pub process_path: Option<String>,
}

#[derive(sqlx::FromRow)]
struct AppRow {
    id: i64,
    bundle_id: String,
    name: String,
    process_path: Option<String>,
    first_seen_at: i64,
    last_seen_at: i64,
}

impl From<AppRow> for App {
    fn from(row: AppRow) -> Self {
        Self {
            id: row.id,
            bundle_id: row.bundle_id,
            name: row.name,
            process_path: row.process_path,
            first_seen_at: row.first_seen_at,
            last_seen_at: row.last_seen_at,
        }
    }
}

// =============================================================================
// App Activity Repository
// =============================================================================

pub struct AppActivityRepository;

impl AppActivityRepository {
    /// Insert a new app activity session.
    /// Returns None if duration is zero or negative (entry skipped).
    pub async fn insert(
        pool: &SqlitePool,
        activity: &UpsertAppActivityInput,
    ) -> Result<Option<i64>, Error> {
        // Skip entries with zero or negative duration
        if activity.end_time <= activity.start_time {
            return Ok(None);
        }

        let id = sqlx::query_scalar(
            "INSERT INTO app_activity (app_id, start_time, end_time) 
             VALUES (?, ?, ?) 
             RETURNING id",
        )
        .bind(activity.app_id)
        .bind(activity.start_time)
        .bind(activity.end_time)
        .fetch_one(pool)
        .await?;

        return Ok(Some(id));
    }

    /// Get app activity sessions in time range
    pub async fn get_by_time_range(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<Vec<AppActivity>, Error> {
        let rows = sqlx::query_as::<_, AppActivityRow>(
            "SELECT id, app_id, start_time, end_time, duration_seconds 
             FROM app_activity 
             WHERE start_time >= ? AND end_time <= ? 
             ORDER BY start_time DESC",
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        return Ok(rows.into_iter().map(AppActivity::from).collect());
    }

    /// Delete all app activity.
    pub async fn delete_all(pool: &SqlitePool) -> Result<(), Error> {
        sqlx::query("DELETE FROM app_activity")
            .execute(pool)
            .await?;
        return Ok(());
    }
}

#[derive(Debug, Clone)]
pub struct UpsertAppActivityInput {
    pub app_id: i64,
    pub start_time: i64,
    pub end_time: i64,
}

#[derive(sqlx::FromRow)]
struct AppActivityRow {
    id: i64,
    app_id: i64,
    start_time: i64,
    end_time: i64,
    duration_seconds: i64,
}

impl From<AppActivityRow> for AppActivity {
    fn from(row: AppActivityRow) -> Self {
        Self {
            id: row.id,
            app_id: row.app_id,
            start_time: row.start_time,
            end_time: row.end_time,
            duration_seconds: row.duration_seconds,
        }
    }
}

// =============================================================================
// Window Activity Repository
// =============================================================================

pub struct WindowActivityRepository;

impl WindowActivityRepository {
    /// Insert a new window activity session.
    /// Returns None if duration is zero or negative (entry skipped).
    pub async fn insert(
        pool: &SqlitePool,
        activity: &UpsertWindowActivityInput,
    ) -> Result<Option<i64>, Error> {
        // Skip entries with zero or negative duration
        if activity.end_time <= activity.start_time {
            return Ok(None);
        }

        let id = sqlx::query_scalar(
            r#"
            INSERT INTO window_activity (
                app_id, window_title, window_id,
                window_x, window_y, window_width, window_height,
                browser_url, browser_is_private,
                start_time, end_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            "#,
        )
        .bind(activity.app_id)
        .bind(&activity.window_title)
        .bind(activity.window_id.map(|id| id as i64))
        .bind(activity.window_x)
        .bind(activity.window_y)
        .bind(activity.window_width)
        .bind(activity.window_height)
        .bind(&activity.browser_url)
        .bind(activity.browser_is_private.map(|p| if p { 1 } else { 0 }))
        .bind(activity.start_time)
        .bind(activity.end_time)
        .fetch_one(pool)
        .await?;

        return Ok(Some(id));
    }

    /// Get window activity sessions in time range.
    pub async fn get_by_time_range(
        pool: &SqlitePool,
        start_time: i64,
        end_time: i64,
    ) -> Result<Vec<WindowActivity>, Error> {
        let rows = sqlx::query_as::<_, WindowActivityRow>(
            r#"
            SELECT 
                id, app_id, window_title, window_id,
                window_x, window_y, window_width, window_height,
                browser_url, browser_is_private,
                start_time, end_time, duration_seconds
            FROM window_activity
            WHERE start_time >= ? AND end_time <= ?
            ORDER BY start_time DESC
            "#,
        )
        .bind(start_time)
        .bind(end_time)
        .fetch_all(pool)
        .await?;

        return Ok(rows.into_iter().map(WindowActivity::from).collect());
    }

    /// Delete all window activity.
    pub async fn delete_all(pool: &SqlitePool) -> Result<(), Error> {
        sqlx::query("DELETE FROM window_activity")
            .execute(pool)
            .await?;
        return Ok(());
    }
}

#[derive(Debug, Clone)]
pub struct UpsertWindowActivityInput {
    pub app_id: i64,
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
    pub start_time: i64,
    pub end_time: i64,
}

impl From<WindowInfo> for UpsertWindowActivityInput {
    fn from(window: WindowInfo) -> Self {
        Self {
            app_id: 0,
            window_title: Some(window.title),
            window_id: Some(window.window_id),
            window_x: Some(window.bounds.x),
            window_y: Some(window.bounds.y),
            window_width: Some(window.bounds.width),
            window_height: Some(window.bounds.height),
            browser_url: window.browser.as_ref().and_then(|b| b.url.clone()),
            browser_is_private: window.browser.as_ref().and_then(|b| b.is_private),
            start_time: current_timestamp(),
            end_time: current_timestamp(),
        }
    }
}

#[derive(sqlx::FromRow)]
struct WindowActivityRow {
    id: i64,
    app_id: i64,
    window_title: Option<String>,
    window_id: Option<i64>,
    window_x: Option<f64>,
    window_y: Option<f64>,
    window_width: Option<f64>,
    window_height: Option<f64>,
    browser_url: Option<String>,
    browser_is_private: Option<i64>,
    start_time: i64,
    end_time: i64,
    duration_seconds: i64,
}

impl From<WindowActivityRow> for WindowActivity {
    fn from(row: WindowActivityRow) -> Self {
        Self {
            id: row.id,
            app_id: row.app_id,
            window_title: row.window_title,
            window_id: row.window_id.map(|id| id as u32),
            window_x: row.window_x,
            window_y: row.window_y,
            window_width: row.window_width,
            window_height: row.window_height,
            browser_url: row.browser_url,
            browser_is_private: row.browser_is_private.map(|p| p == 1),
            start_time: row.start_time,
            end_time: row.end_time,
            duration_seconds: row.duration_seconds,
        }
    }
}
