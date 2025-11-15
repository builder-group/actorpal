use std::sync::atomic::{AtomicBool, Ordering};

pub struct AppState {
    block_exit: AtomicBool,
}

impl AppState {
    pub fn new(block_exit: bool) -> Self {
        Self {
            block_exit: AtomicBool::new(block_exit),
        }
    }

    pub fn is_exit_blocked(&self) -> bool {
        self.block_exit.load(Ordering::Acquire)
    }

    pub fn set_block_exit(&self, block: bool) {
        self.block_exit.store(block, Ordering::Release);
    }
}
