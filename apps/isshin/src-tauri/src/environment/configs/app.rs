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

    pub fn app_data_subdir() -> Option<&'static str> {
        if cfg!(debug_assertions) {
            return Some("dev");
        }
        return None;
    }

    pub fn tray_icon_bytes() -> &'static [u8] {
        if cfg!(debug_assertions) {
            return include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/icons/tray-default-icon-dev.png"
            ));
        }
        return include_bytes!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/icons/tray-default-icon.png"
        ));
    }
}
