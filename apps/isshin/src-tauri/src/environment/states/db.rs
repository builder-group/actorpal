use crate::common::db::Database;

/// Type alias for database state.
/// `Database` contains a `Pool<Sqlite>` which is already thread-safe, so no `Mutex` needed.
pub type DatabaseState = Database;
