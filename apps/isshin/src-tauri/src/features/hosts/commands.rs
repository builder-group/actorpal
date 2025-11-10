use super::hosts_file::HostsFile;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const HOSTS_PATH: &str = "/etc/hosts";

fn write_hosts_with_elevated_privileges(content: &str) -> Result<(), String> {
    let temp_file = format!("/tmp/hosts_{}", std::process::id());
    fs::write(&temp_file, content).map_err(|e| format!("Failed to write temp file: {}", e))?;

    let script = format!(
        r#"do shell script "cp {} /etc/hosts" with administrator privileges"#,
        temp_file
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    let _ = fs::remove_file(&temp_file);

    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "AppleScript failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

fn write_hosts_file(hosts: &HostsFile) -> Result<(), String> {
    // Try direct write first (works if app has permissions)
    if hosts.write().is_ok() {
        return Ok(());
    }

    // Fall back to AppleScript with admin privileges (prompts for password)
    write_hosts_with_elevated_privileges(&hosts.content())
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn block_websites(domains: Vec<String>) -> Result<usize, String> {
    if domains.is_empty() {
        return Ok(0);
    }

    let hosts_path = PathBuf::from(HOSTS_PATH);
    let mut hosts =
        HostsFile::new(hosts_path).map_err(|e| format!("Failed to read hosts file: {}", e))?;

    let blocked_sites = hosts.blocked_sites();
    let new_sites: Vec<String> = domains
        .into_iter()
        .filter(|domain| !blocked_sites.contains(domain))
        .collect();

    if new_sites.is_empty() {
        return Ok(0);
    }

    hosts.add(new_sites.clone());
    write_hosts_file(&hosts)?;

    Ok(new_sites.len())
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn unblock_website(domain: String) -> Result<bool, String> {
    let hosts_path = PathBuf::from(HOSTS_PATH);
    let mut hosts =
        HostsFile::new(hosts_path).map_err(|e| format!("Failed to read hosts file: {}", e))?;

    let blocked_sites = hosts.blocked_sites();
    if !blocked_sites.contains(&domain) {
        return Ok(false);
    }

    hosts.delete(vec![domain]);
    write_hosts_file(&hosts)?;

    Ok(true)
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn get_blocked_websites() -> Result<Vec<String>, String> {
    let hosts_path = PathBuf::from(HOSTS_PATH);
    let hosts =
        HostsFile::new(hosts_path).map_err(|e| format!("Failed to read hosts file: {}", e))?;

    Ok(hosts.blocked_sites())
}
