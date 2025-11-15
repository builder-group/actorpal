-- Create activity_entries table
CREATE TABLE IF NOT EXISTS activity_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application TEXT NOT NULL,
    bundle_id TEXT,
    pid INTEGER,
    process_path TEXT,
    window_title TEXT,
    window_id INTEGER,
    window_x REAL,
    window_y REAL,
    window_width REAL,
    window_height REAL,
    browser_url TEXT,
    browser_is_private INTEGER,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_entries_start_time ON activity_entries (start_time);

CREATE INDEX IF NOT EXISTS idx_activity_entries_bundle_id ON activity_entries (bundle_id);

CREATE INDEX IF NOT EXISTS idx_activity_entries_application ON activity_entries (application);

CREATE INDEX IF NOT EXISTS idx_activity_entries_window_id ON activity_entries (window_id);