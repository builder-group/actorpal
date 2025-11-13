use sqlx::{migrate::Migrator, sqlite::SqlitePool, Pool, Sqlite};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

pub struct Database {
    pub pool: Pool<Sqlite>,
}

impl Database {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Get database path from environment variable or use default
        // This allows overriding the database location for development/testing
        let db_path = if let Ok(custom_path) = env::var("ISSHIN_DB_PATH") {
            PathBuf::from(custom_path)
        } else {
            // Default: Use dirs crate to get app data directory
            let app_dir = dirs::home_dir()
                .expect("Could not find home directory")
                .join(".isshin");

            // Ensure the app directory exists
            fs::create_dir_all(&app_dir)?;

            app_dir.join("isshin.db")
        };

        // Configure connection options with Write-Ahead Logging for better concurrent access
        let connection_options = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

        let pool = SqlitePool::connect_with(connection_options).await?;

        // Run migrations using runtime migrator
        // Migrations directory is relative to the crate root (src-tauri)
        let migrations_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");
        let migrator = Migrator::new(migrations_path).await?;
        migrator.run(&pool).await?;

        Ok(Database { pool })
    }
}

// State wrapper for Tauri
pub struct DatabaseState(pub Pool<Sqlite>);
