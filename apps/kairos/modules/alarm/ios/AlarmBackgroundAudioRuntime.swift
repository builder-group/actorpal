import AVFoundation
import Foundation

final class AlarmBackgroundAudioRuntime {
    private let notificationRuntime: AlarmNotificationRuntime
    private var sessionTimer: DispatchSourceTimer?
    private var sessionPlayer: AVAudioPlayer?
    private var sessionEndPlayer: AVAudioPlayer?
    private var activeNotificationId: String?

    init(notificationRuntime: AlarmNotificationRuntime) {
        self.notificationRuntime = notificationRuntime
    }

    func startSession(
        durationMs: Double,
        sessionSoundFile: String,
        sessionEndSoundName: String,
        notificationId: String
    ) async throws {
        try configureAudioSession()
        // Session sound is a bundled asset; sessionEndSound is user-selected from the system library.
        guard let sessionSoundURL = resolveSessionSound(named: sessionSoundFile)
        else {
            throw AlarmError.soundNotFound(sessionSoundFile)
        }
        guard
            let sessionEndURL = SoundLibrary.resolveURL(
                for: sessionEndSoundName
            )
        else {
            throw AlarmError.soundNotFound(sessionEndSoundName)
        }
        let sessionSoundLoopURL = try makeSessionSoundLoop(
            from: sessionSoundURL
        )
        let endTimeMs = Date().timeIntervalSince1970 * 1000 + durationMs

        notificationRuntime.cancel(identifier: notificationId)
        try await notificationRuntime.schedule(
            identifier: notificationId,
            endTimeMs: endTimeMs,
            soundFile: nil
        )

        try await MainActor.run {
            teardownPlayback()

            let player = try AVAudioPlayer(contentsOf: sessionSoundLoopURL)
            player.numberOfLoops = -1
            player.prepareToPlay()
            player.play()
            sessionPlayer = player

            let timer = DispatchSource.makeTimerSource(queue: .main)
            timer.schedule(deadline: .now() + .milliseconds(Int(durationMs)))
            timer.setEventHandler { [weak self] in
                self?.handleSessionEnd(
                    sessionEndURL: sessionEndURL,
                    notificationId: notificationId
                )
            }
            timer.resume()
            sessionTimer = timer
            activeNotificationId = notificationId
        }
    }

    func stopSession(cancelNotification: Bool) {
        let idToCancel = cancelNotification ? activeNotificationId : nil
        activeNotificationId = nil

        DispatchQueue.main.async {
            self.teardownPlayback()
            try? AVAudioSession.sharedInstance().setActive(
                false,
                options: .notifyOthersOnDeactivation
            )
        }

        if let id = idToCancel {
            notificationRuntime.cancel(identifier: id)
        }
    }

    func resolveSessionSoundURL(named soundFile: String) -> URL? {
        resolveSessionSound(named: soundFile)
    }

    private func configureAudioSession() throws {
        try AVAudioSession.sharedInstance().setCategory(
            .playback,
            mode: .default
        )
        try AVAudioSession.sharedInstance().setActive(true)
    }

    private func teardownPlayback() {
        sessionTimer?.cancel()
        sessionTimer = nil
        sessionPlayer?.stop()
        sessionPlayer = nil
        sessionEndPlayer?.stop()
        sessionEndPlayer = nil
    }

    private func handleSessionEnd(sessionEndURL: URL, notificationId: String) {
        sessionTimer?.cancel()
        sessionTimer = nil
        sessionPlayer?.stop()
        sessionPlayer = nil

        do {
            let player = try AVAudioPlayer(contentsOf: sessionEndURL)
            player.numberOfLoops = -1
            player.prepareToPlay()
            player.play()
            sessionEndPlayer = player
            notificationRuntime.cancel(identifier: notificationId)
        } catch {
            // Leave the notification fallback in place if native playback fails.
        }
    }

    private func resolveSessionSound(named soundFile: String) -> URL? {
        if let url = Bundle.main.url(forResource: soundFile, withExtension: nil)
        {
            return url
        }

        let name = URL(fileURLWithPath: soundFile).deletingPathExtension()
            .lastPathComponent
        for ext in ["mp3", "caf", "wav", "aiff"] {
            if let url = Bundle.main.url(forResource: name, withExtension: ext)
            {
                return url
            }
        }
        return nil
    }

    private func makeSessionSoundLoop(from sourceURL: URL) throws -> URL {
        // Pad the sound to exactly 1 second with trailing silence so that
        // numberOfLoops = -1 produces one tick per second regardless of the
        // clip's actual duration.
        let intervalSeconds: Double = 1.0
        let modDate =
            (try? FileManager.default.attributesOfItem(atPath: sourceURL.path)[
                .modificationDate
            ] as? Date)?.timeIntervalSince1970 ?? 0
        let cacheKey = "\(sourceURL.lastPathComponent)_\(Int(modDate)).caf"
        let destURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(cacheKey)
        if FileManager.default.fileExists(atPath: destURL.path) {
            return destURL
        }

        let sourceFile = try AVAudioFile(forReading: sourceURL)
        let format = sourceFile.processingFormat
        let sourceFrames = AVAudioFrameCount(sourceFile.length)
        let minimumFrames = AVAudioFrameCount(
            intervalSeconds * format.sampleRate
        )
        let totalFrames = max(sourceFrames, minimumFrames)

        let outputFile = try AVAudioFile(
            forWriting: destURL,
            settings: format.settings
        )
        guard
            let sourceBuffer = AVAudioPCMBuffer(
                pcmFormat: format,
                frameCapacity: sourceFrames
            )
        else {
            throw AlarmError.sessionSoundLoopFailed
        }

        try sourceFile.read(into: sourceBuffer)
        try outputFile.write(from: sourceBuffer)

        let remainingFrames = totalFrames - sourceBuffer.frameLength
        if remainingFrames > 0 {
            guard
                let silenceBuffer = AVAudioPCMBuffer(
                    pcmFormat: format,
                    frameCapacity: remainingFrames
                )
            else {
                throw AlarmError.sessionSoundLoopFailed
            }
            silenceBuffer.frameLength = remainingFrames
            try outputFile.write(from: silenceBuffer)
        }

        return destURL
    }

}
