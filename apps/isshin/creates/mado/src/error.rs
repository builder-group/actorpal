//! Error types for mado

use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Platform error: {0}")]
    Platform(String),

    #[cfg(target_os = "macos")]
    #[error("macOS error: {0}")]
    MacOS(String),

    #[cfg(target_os = "linux")]
    #[error("Linux error: {0}")]
    Linux(String),

    #[cfg(target_os = "windows")]
    #[error("Windows error: {0}")]
    Windows(String),

    #[error("Accessibility permissions required. Enable in System Settings > Privacy & Security > Accessibility")]
    MissingPermissions,
}
