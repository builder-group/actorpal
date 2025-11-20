CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bundle_id TEXT, -- Stable identifier (e.g. "com.google.Chrome")
    name TEXT, -- Display name
    process_path TEXT, -- Executable path
    first_seen_at INTEGER NOT NULL, -- Unix timestamp
    last_seen_at INTEGER NOT NULL, -- Unix timestamp (for cleanup/analytics)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App activity: Tracks app-level focus sessions
CREATE TABLE IF NOT EXISTS app_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL, -- Foreign key to apps
    start_time INTEGER NOT NULL, -- Unix timestamp (seconds)
    end_time INTEGER NOT NULL, -- Unix timestamp (seconds)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps (id) ON DELETE CASCADE
);

-- Window activity: Tracks window-level focus sessions
CREATE TABLE IF NOT EXISTS window_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL, -- Foreign key to apps
    window_title TEXT, -- Window title (changes frequently - tab switches)
    window_id INTEGER, -- Platform window ID (changes when window closes)
    window_x REAL, -- Window position
    window_y REAL,
    window_width REAL,
    window_height REAL,
    browser_url TEXT, -- Browser URL (changes on every tab switch)
    browser_is_private INTEGER, -- NULL, 0 (false), or 1 (true)
    start_time INTEGER NOT NULL, -- Unix timestamp (seconds)
    end_time INTEGER NOT NULL, -- Unix timestamp (seconds)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps (id) ON DELETE CASCADE
);

-- Indexes for apps
CREATE INDEX IF NOT EXISTS idx_apps_bundle_id ON apps (bundle_id);

CREATE INDEX IF NOT EXISTS idx_apps_name ON apps (name);

-- Indexes for app_activity
CREATE INDEX IF NOT EXISTS idx_app_activity_start_time ON app_activity (start_time DESC);

CREATE INDEX IF NOT EXISTS idx_app_activity_end_time ON app_activity (end_time DESC);

CREATE INDEX IF NOT EXISTS idx_app_activity_time_range ON app_activity (start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_app_activity_app_id ON app_activity (app_id, start_time DESC);

-- Indexes for window_activity
CREATE INDEX IF NOT EXISTS idx_window_start_time ON window_activity (start_time DESC);

CREATE INDEX IF NOT EXISTS idx_window_end_time ON window_activity (end_time DESC);

CREATE INDEX IF NOT EXISTS idx_window_time_range ON window_activity (start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_window_app_id ON window_activity (app_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_window_window_title ON window_activity (app_id, window_title);

CREATE INDEX IF NOT EXISTS idx_window_browser_url ON window_activity (browser_url)
WHERE
    browser_url IS NOT NULL;

-- View for unified app activity (combines app_activity + window_activity by app)
CREATE VIEW IF NOT EXISTS app_time_summary AS
SELECT
    a.id as app_id,
    a.bundle_id,
    a.name,
    COALESCE(app_time.total_seconds, 0) + COALESCE(window_time.total_seconds, 0) as total_seconds,
    COALESCE(app_time.session_count, 0) + COALESCE(window_time.session_count, 0) as session_count
FROM
    apps a
    LEFT JOIN (
        SELECT
            app_id,
            SUM(end_time - start_time) as total_seconds,
            COUNT(*) as session_count
        FROM app_activity
        GROUP BY
            app_id
    ) app_time ON a.id = app_time.app_id
    LEFT JOIN (
        SELECT
            app_id,
            SUM(end_time - start_time) as total_seconds,
            COUNT(*) as session_count
        FROM window_activity
        GROUP BY
            app_id
    ) window_time ON a.id = window_time.app_id;