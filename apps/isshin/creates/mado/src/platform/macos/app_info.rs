use crate::AppInfo;
use objc2::rc::Retained;
use objc2_app_kit::{NSRunningApplication, NSWorkspace, NSWorkspaceApplicationKey};
use objc2_foundation::NSNotification;

/// Get information about the current frontmost application.
///
/// Aggregates data from multiple sources:
/// - NSWorkspace for app information
pub fn get_current_app() -> Option<AppInfo> {
    let pid = get_current_pid()?;
    return get_app_info_from_pid(pid);
}

/// Extract AppInfo for a given PID.
pub fn get_app_info_from_pid(pid: i32) -> Option<AppInfo> {
    return Some(AppInfo {
        pid,
        name: get_app_name(pid),
        bundle_id: get_bundle_id(pid),
        process_path: get_process_path(pid),
    });
}

/// Extract AppInfo from NSWorkspace activation notification.
pub fn get_app_info_from_notification(notification: &NSNotification) -> Option<AppInfo> {
    let user_info = notification.userInfo()?;
    let app: Retained<NSRunningApplication> = user_info
        .objectForKey(unsafe { NSWorkspaceApplicationKey })?
        .downcast()
        .ok()?;

    let pid = app.processIdentifier();
    return Some(AppInfo {
        pid,
        name: app.localizedName().map(|s| s.to_string()),
        bundle_id: app.bundleIdentifier().map(|s| s.to_string()),
        process_path: get_process_path(pid),
    });
}

/// Get PID of the currently frontmost application.
pub fn get_current_pid() -> Option<i32> {
    let workspace = NSWorkspace::sharedWorkspace();
    let app = workspace.frontmostApplication()?;
    return Some(app.processIdentifier());
}

/// Get localized name of application by PID.
fn get_app_name(pid: i32) -> Option<String> {
    let app = NSRunningApplication::runningApplicationWithProcessIdentifier(pid)?;
    return app.localizedName().map(|s| s.to_string());
}

/// Get bundle identifier of application by PID.
fn get_bundle_id(pid: i32) -> Option<String> {
    let app = NSRunningApplication::runningApplicationWithProcessIdentifier(pid)?;
    return app.bundleIdentifier().map(|s| s.to_string());
}

/// Get process executable path by PID (uses proc_pidpath system call).
///
/// Returns canonicalized path if possible, otherwise returns the raw path.
fn get_process_path(pid: i32) -> Option<String> {
    #[link(name = "proc")]
    extern "C" {
        fn proc_pidpath(pid: i32, buffer: *mut libc::c_char, buffersize: u32) -> i32;
    }

    let mut buf = vec![0 as libc::c_char; 4096];
    let ret = unsafe { proc_pidpath(pid, buf.as_mut_ptr(), 4096) };

    if ret <= 0 {
        return None;
    }

    let path_str = unsafe { std::ffi::CStr::from_ptr(buf.as_ptr()) }
        .to_str()
        .ok()?;
    return std::fs::canonicalize(path_str)
        .ok()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .or_else(|| Some(path_str.to_string()));
}
