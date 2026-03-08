use super::types::{App, AppActivity, WindowActivity};
use crate::common::time::current_timestamp;
use mado::{BrowserInfo, WindowBounds};
use sqlx::{Error, SqlitePool};

// =============================================================================
// App Repository
// =============================================================================

pub struct AppRepository;

impl AppRepository {
    /// Upsert app (insert or update if exists by bundle_id or process_path).
    pub async fn upsert(pool: &SqlitePool, app: &UpsertAppInput) -> Result<i64, Error> {
        let now = current_timestamp();

        // Try to find existing app by bundle_id or process_path
        let existing = sqlx::query_scalar::<_, i64>(
            "SELECT id FROM apps 
             WHERE (bundle_id = ? AND bundle_id IS NOT NULL) 
                OR (process_path = ? AND bundle_id IS NULL AND process_path IS NOT NULL)
             LIMIT 1",
        )
        .bind(app.bundle_id.as_deref())
        .bind(app.process_path.as_deref())
        .fetch_optional(pool)
        .await?;

        // Update existing app
        if let Some(id) = existing {
            sqlx::query(
                "UPDATE apps SET bundle_id = ?, name = ?, process_path = ?, last_seen_at = ? WHERE id = ?",
            )
            .bind(&app.bundle_id)
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
    pub bundle_id: Option<String>,
    pub name: Option<String>,
    pub process_path: Option<String>,
}

#[derive(sqlx::FromRow)]
struct AppRow {
    id: i64,
    bundle_id: Option<String>,
    name: Option<String>,
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
        activity: &InsertAppActivityInput,
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
            "SELECT id, app_id, start_time, end_time 
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
pub struct InsertAppActivityInput {
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
}

impl From<AppActivityRow> for AppActivity {
    fn from(row: AppActivityRow) -> Self {
        Self {
            id: row.id,
            app_id: row.app_id,
            start_time: row.start_time,
            end_time: row.end_time,
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
        activity: &InsertWindowActivityInput,
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
        .bind(activity.window_bounds.as_ref().map(|b| b.x))
        .bind(activity.window_bounds.as_ref().map(|b| b.y))
        .bind(activity.window_bounds.as_ref().map(|b| b.width))
        .bind(activity.window_bounds.as_ref().map(|b| b.height))
        .bind(activity.browser.as_ref().and_then(|b| b.url.clone()))
        .bind(
            activity
                .browser
                .as_ref()
                .and_then(|b| b.is_private.map(|p| if p { 1 } else { 0 })),
        )
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
                start_time, end_time
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
pub struct InsertWindowActivityInput {
    pub app_id: i64,
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_bounds: Option<WindowBounds>,
    pub browser: Option<BrowserInfo>,
    pub start_time: i64,
    pub end_time: i64,
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
}

impl From<WindowActivityRow> for WindowActivity {
    fn from(row: WindowActivityRow) -> Self {
        let window_bounds = match (
            row.window_x,
            row.window_y,
            row.window_width,
            row.window_height,
        ) {
            (Some(x), Some(y), Some(width), Some(height)) => Some(WindowBounds {
                x,
                y,
                width,
                height,
            }),
            _ => None,
        };
        let browser = match (row.browser_url, row.browser_is_private) {
            (url, is_private) if url.is_some() || is_private.is_some() => Some(BrowserInfo {
                url: url,
                is_private: is_private.map(|p| p == 1),
            }),
            _ => None,
        };

        return Self {
            id: row.id,
            app_id: row.app_id,
            window_title: row.window_title,
            window_id: row.window_id.map(|id| id as u32),
            window_bounds,
            browser,
            start_time: row.start_time,
            end_time: row.end_time,
        };
    }
}
