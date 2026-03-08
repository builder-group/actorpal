use std::path::PathBuf;

use crate::environment::configs::app::AppConfig;

pub struct DbConfig;

impl DbConfig {
    pub fn db_name() -> &'static str {
        "isshin.db"
    }

    pub fn migrations_dir() -> PathBuf {
        AppConfig::cargo_manifest_dir().join("migrations")
    }
}
