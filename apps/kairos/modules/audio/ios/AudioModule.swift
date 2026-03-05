import AVFoundation
import ExpoModulesCore

public class AudioModule: Module {
	private var player: AVAudioPlayer?

	public func definition() -> ModuleDefinition {
		Name("Audio")

		// .playback category so the alarm fires even when the device is silenced.
		AsyncFunction("play") { (soundName: String) throws in
			try self.configureSession()
			guard let url = self.resolveURL(for: soundName) else {
				throw AudioError.soundNotFound(soundName)
			}
			// Create and play on main thread; AVAudioPlayer is not thread-safe.
			DispatchQueue.main.async {
				self.player = try? AVAudioPlayer(contentsOf: url)
				self.player?.numberOfLoops = -1
				self.player?.play()
			}
		}

		Function("stop") {
			DispatchQueue.main.async {
				self.player?.stop()
				self.player = nil
			}
		}

		AsyncFunction("getSystemSounds") { () -> [String] in
			return self.enumerateSystemSounds()
		}
	}

	// MARK: - Private

	private func configureSession() throws {
		try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
		try AVAudioSession.sharedInstance().setActive(true)
	}

	private func resolveURL(for soundName: String) -> URL? {
		let searchDirs = [
			"/Library/Ringtones",
			"/System/Library/Audio/UISounds/Modern",
			"/System/Library/Audio/UISounds",
			"/System/Library/Audio/UISounds/New",
		]
		let extensions = ["m4r", "caf", "aiff", "wav", "mp3"]

		for dir in searchDirs {
			for ext in extensions {
				for candidate in [soundName, soundName.prefix(1).uppercased() + soundName.dropFirst()] {
					let path = "\(dir)/\(candidate).\(ext)"
					if FileManager.default.fileExists(atPath: path) {
						return URL(fileURLWithPath: path)
					}
				}
			}
		}

		// Fallback: app bundle (for bundled assets)
		for ext in extensions {
			if let url = Bundle.main.url(forResource: soundName, withExtension: ext) {
				return url
			}
		}

		return nil
	}

	// /Library/Ringtones has proper alarm-quality sounds (Radar, Apex, etc.); falls back to UISounds/Modern if inaccessible.
	private func enumerateSystemSounds() -> [String] {
		let validExtensions = Set(["m4r", "caf", "aiff", "wav", "mp3"])

		func soundNames(in dir: String) -> [String] {
			guard let files = try? FileManager.default.contentsOfDirectory(atPath: dir) else {
				return []
			}
			return files.compactMap { file -> String? in
				let url = URL(fileURLWithPath: file)
				guard validExtensions.contains(url.pathExtension.lowercased()) else { return nil }
				return url.deletingPathExtension().lastPathComponent
			}.sorted()
		}

		let ringtones = soundNames(in: "/Library/Ringtones")
		if !ringtones.isEmpty {
			return ringtones
		}

		return soundNames(in: "/System/Library/Audio/UISounds/Modern")
	}
}

// MARK: - Errors

enum AudioError: LocalizedError {
	case soundNotFound(String)

	var errorDescription: String? {
		switch self {
		case .soundNotFound(let name):
			return "Sound '\(name)' not found in system paths or app bundle."
		}
	}
}
