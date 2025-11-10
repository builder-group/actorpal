use super::types::ActivityEntry;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActivityStorage {
    pub entries: Vec<ActivityEntry>,
}

impl ActivityStorage {
    fn get_storage_path() -> PathBuf {
        dirs::home_dir()
            .expect("Could not find home directory")
            .join(".isshin")
            .join("activity_tracking.json")
    }

    fn ensure_directory_exists() {
        let data_dir = dirs::home_dir()
            .expect("Could not find home directory")
            .join(".isshin");

        if !data_dir.exists() {
            fs::create_dir_all(&data_dir).expect("Could not create data directory");
        }
    }

    pub fn add_entry(&mut self, entry: ActivityEntry) {
        self.entries.push(entry);
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let path = Self::get_storage_path();

        if !path.exists() {
            return Ok(Self::default());
        }

        let data = fs::read_to_string(path)?;
        let storage: ActivityStorage = serde_json::from_str(&data)?;
        Ok(storage)
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        Self::ensure_directory_exists();
        let path = Self::get_storage_path();
        let data = serde_json::to_string_pretty(self)?;
        fs::write(path, data)?;
        Ok(())
    }
}
