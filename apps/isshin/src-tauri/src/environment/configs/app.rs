use std::path::Path;

pub struct AppConfig;

impl AppConfig {
    pub fn cargo_manifest_dir() -> &'static Path {
        Path::new(env!("CARGO_MANIFEST_DIR"))
    }

    pub fn app_name() -> &'static str {
        "Isshin"
    }

    pub fn tray_tooltip() -> &'static str {
        Self::app_name()
    }

    pub fn tray_icon_bytes() -> &'static [u8] {
        include_bytes!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/icons/tray-default-icon.png"
        ))
    }
}
