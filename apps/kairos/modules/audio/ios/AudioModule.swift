import AVFoundation
import ExpoModulesCore

public class AudioModule: Module {
    private var player: AVAudioPlayer?

    public func definition() -> ModuleDefinition {
        Name("Audio")

        // .playback category so the alarm fires even when the device is silenced.
        AsyncFunction("play") { (soundName: String) throws in
            try self.configureSession()
            guard let url = SoundLibrary.resolveURL(for: soundName) else {
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
            return SoundLibrary.enumerateSystemSounds()
        }
    }

    // MARK: - Helpers

    private func configureSession() throws {
        try AVAudioSession.sharedInstance().setCategory(
            .playback,
            mode: .default
        )
        try AVAudioSession.sharedInstance().setActive(true)
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
