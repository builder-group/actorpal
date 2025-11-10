use std::fs;
use std::io::Write;
use std::path::PathBuf;

const LOCALHOST_IPV4: &str = "127.0.0.1";

#[derive(Debug, PartialEq)]
enum HostsLine {
    Empty,
    Comment(String),
    BlockedSite(String),
    Other(String),
}

pub struct HostsFile {
    path: PathBuf,
    lines: Vec<HostsLine>,
}

impl HostsFile {
    pub fn new(path: PathBuf) -> Result<Self, std::io::Error> {
        let lines = fs::read_to_string(&path)?
            .lines()
            .map(HostsLine::from)
            .collect();
        Ok(Self { path, lines })
    }

    pub fn blocked_sites(&self) -> Vec<String> {
        self.lines
            .iter()
            .filter_map(|line| match line {
                HostsLine::BlockedSite(site) => Some(site.clone()),
                _ => None,
            })
            .collect()
    }

    pub fn add(&mut self, sites: Vec<String>) {
        let blocked_sites = self.blocked_sites();
        self.lines.extend(
            sites
                .into_iter()
                .filter(|site| !blocked_sites.contains(site))
                .map(HostsLine::BlockedSite),
        );
    }

    pub fn delete(&mut self, sites: Vec<String>) {
        self.lines.retain(|line| match line {
            HostsLine::BlockedSite(site) => !sites.contains(site),
            _ => true,
        });
    }

    pub fn content(&self) -> String {
        self.lines
            .iter()
            .map(String::from)
            .collect::<Vec<String>>()
            .join("\n")
    }

    pub fn write(&self) -> std::io::Result<()> {
        let mut file = match fs::File::create(&self.path) {
            Ok(file) => file,
            Err(err) => match err.kind() {
                std::io::ErrorKind::PermissionDenied => {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::PermissionDenied,
                        format!("{}. Try using 'sudo'", err),
                    ));
                }
                _ => return Err(err),
            },
        };

        file.write_all(self.content().as_bytes())
    }
}

impl From<&str> for HostsLine {
    fn from(line: &str) -> Self {
        match line {
            line if line.is_empty() => HostsLine::Empty,
            line if line.starts_with('#') => HostsLine::Comment(line.to_string()),
            line if line.starts_with(LOCALHOST_IPV4) => {
                // Parse "127.0.0.1 domain.com" format
                let parts: Vec<&str> = line.split_whitespace().collect();
                match parts.as_slice() {
                    [_, "localhost"] => HostsLine::Other(line.to_string()),
                    [_, domain] => HostsLine::BlockedSite(domain.to_string()),
                    _ => HostsLine::Other(line.to_string()),
                }
            }
            line => HostsLine::Other(line.to_string()),
        }
    }
}

impl From<&HostsLine> for String {
    fn from(line: &HostsLine) -> String {
        match line {
            HostsLine::Empty => String::new(),
            HostsLine::Comment(text) => text.to_string(),
            HostsLine::BlockedSite(site) => format!("{}\t{}", LOCALHOST_IPV4, site),
            HostsLine::Other(text) => text.to_string(),
        }
    }
}
