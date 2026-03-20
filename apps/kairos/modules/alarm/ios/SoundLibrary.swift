import Foundation

enum SoundLibrary {
    private static let searchDirs = [
        "/Library/Ringtones",
        "/System/Library/Audio/UISounds/Modern",
        "/System/Library/Audio/UISounds",
        "/System/Library/Audio/UISounds/New",
    ]

    private static let soundExtensions = ["m4r", "caf", "aiff", "wav", "mp3"]
    private static let validExtensions = Set(soundExtensions)

    static func resolveURL(for soundName: String) -> URL? {
        for dir in searchDirs {
            for ext in soundExtensions {
                for candidate in [
                    soundName,
                    soundName.prefix(1).uppercased() + soundName.dropFirst(),
                ] {
                    let path = "\(dir)/\(candidate).\(ext)"
                    if FileManager.default.fileExists(atPath: path) {
                        return URL(fileURLWithPath: path)
                    }
                }
            }
        }

        for ext in soundExtensions {
            if let url = Bundle.main.url(
                forResource: soundName,
                withExtension: ext
            ) {
                return url
            }
        }

        return nil
    }

    static func enumerateSystemSounds() -> [String] {
        let ringtones = soundNames(in: "/Library/Ringtones")
        if !ringtones.isEmpty {
            return ringtones
        }

        return soundNames(in: "/System/Library/Audio/UISounds/Modern")
    }

    private static func soundNames(in dir: String) -> [String] {
        guard
            let files = try? FileManager.default.contentsOfDirectory(
                atPath: dir
            )
        else {
            return []
        }

        return files.compactMap { file -> String? in
            let url = URL(fileURLWithPath: file)
            guard validExtensions.contains(url.pathExtension.lowercased())
            else { return nil }
            return url.deletingPathExtension().lastPathComponent
        }.sorted()
    }
}
