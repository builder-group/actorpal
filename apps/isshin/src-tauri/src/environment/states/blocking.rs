use crate::features::blocking::types::BlockingState as BlockingStateType;
use std::sync::Mutex;

/// Type alias for blocking state.
/// `Mutex` is used to ensure thread-safe access to the blocking state.
pub type BlockingState = Mutex<BlockingStateType>;
