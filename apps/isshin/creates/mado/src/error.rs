//! Error types for mado

use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Platform error: {0}")]
    Platform(String),

    #[error("Accessibility permissions required. Enable in System Settings > Privacy & Security > Accessibility")]
    MissingPermissions,
}
