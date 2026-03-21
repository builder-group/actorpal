import AVFoundation
import Foundation

final class AlarmBackgroundAudioRuntime {
    private let notificationRuntime: AlarmNotificationRuntime
    private var countdownTimer: DispatchSourceTimer?
    private var countdownPlayer: AVAudioPlayer?
    private var alarmPlayer: AVAudioPlayer?
    private var notificationId: String?
    private var nativeAlarm = true

    init(notificationRuntime: AlarmNotificationRuntime) {
        self.notificationRuntime = notificationRuntime
    }

    func startSession(
        durationMs: Double,
        countdownSoundFile: String?,
        endSoundName: String,
        nativeAlarm: Bool,
        notificationId: String
    ) async throws {
        self.nativeAlarm = nativeAlarm
        try configureAudioSession()
        // if countdown sound file is nil run a silent loop so the audio session stays alive without a file asset
        let countdownLoopURL: URL
        if let soundFile = countdownSoundFile {
            guard let sessionSoundURL = resolveCountdownSound(named: soundFile)
            else {
                throw AlarmError.soundNotFound(soundFile)
            }
            countdownLoopURL = try makeCountdownSoundLoop(
                from: sessionSoundURL
            )
        } else {
            countdownLoopURL = try makeSilentLoop()
        }
        guard
            let endSoundURL = SoundLibrary.resolveURL(
                for: endSoundName
            )
        else {
            throw AlarmError.soundNotFound(endSoundName)
        }
        let endTimeMs = Date().timeIntervalSince1970 * 1000 + durationMs

        notificationRuntime.cancel(identifier: notificationId)
        do {
            // nativeAlarm=true  → schedule silent notification (alarm plays natively at end)
            // nativeAlarm=false → notification is the primary alert, schedule it with sound
            let notificationSoundFile: String? =
                nativeAlarm
                ? nil
                : (try? notificationRuntime.prepareNotificationSound(
                    from: endSoundURL,
                    named: endSoundName
                ))
            try await notificationRuntime.schedule(
                identifier: notificationId,
                endTimeMs: endTimeMs,
                soundFile: notificationSoundFile
            )
        } catch {
            // Keep the background-audio path alive even when notification fallback
            // is unavailable (e.g. permission denied)
        }

        try await MainActor.run {
            teardownPlayback()

            let player = try AVAudioPlayer(contentsOf: countdownLoopURL)
            player.numberOfLoops = -1
            player.prepareToPlay()
            player.play()
            countdownPlayer = player

            let timer = DispatchSource.makeTimerSource(queue: .main)
            timer.schedule(deadline: .now() + .milliseconds(Int(durationMs)))
            timer.setEventHandler { [weak self] in
                self?.handleSessionEnd(
                    endSoundURL: endSoundURL,
                    notificationId: notificationId
                )
            }
            timer.resume()
            countdownTimer = timer
            self.notificationId = notificationId
        }
    }

    func stopSession(cancelNotification: Bool) {
        let idToCancel = cancelNotification ? notificationId : nil
        notificationId = nil

        DispatchQueue.main.async {
            self.teardownPlayback()
            // Note: Leaving the AVAudioSession active so JS audio can use it immediately; iOS reclaims it once all players are idle
        }

        if let id = idToCancel {
            notificationRuntime.cancel(identifier: id)
        }
    }

    func resolveCountdownSoundURL(named soundFile: String) -> URL? {
        resolveCountdownSound(named: soundFile)
    }

    private func configureAudioSession() throws {
        try AVAudioSession.sharedInstance().setCategory(
            .playback,
            mode: .default
        )
        try AVAudioSession.sharedInstance().setActive(true)
    }

    private func teardownPlayback() {
        countdownTimer?.cancel()
        countdownTimer = nil
        countdownPlayer?.stop()
        countdownPlayer = nil
        alarmPlayer?.stop()
        alarmPlayer = nil
    }

    private func handleSessionEnd(endSoundURL: URL, notificationId: String) {
        countdownTimer?.cancel()
        countdownTimer = nil
        countdownPlayer?.stop()
        countdownPlayer = nil

        // Play alarm natively; notification fires too as a tap-back to the app
        // if nativeAlarm=false: countdown sound stopped, notification fires with its sound
        if nativeAlarm {
            do {
                let player = try AVAudioPlayer(contentsOf: endSoundURL)
                player.numberOfLoops = -1
                player.prepareToPlay()
                player.play()
                alarmPlayer = player
            } catch {
                // do nothing
            }
        }

    }

    private func resolveCountdownSound(named soundFile: String) -> URL? {
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

    private func makeSilentLoop() throws -> URL {
        let destURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("kairos_silent-loop.caf")
        if FileManager.default.fileExists(atPath: destURL.path) {
            return destURL
        }
        guard
            let format = AVAudioFormat(
                standardFormatWithSampleRate: 44100,
                channels: 1
            )
        else {
            throw AlarmError.countdownLoopFailed
        }
        let frameCount = AVAudioFrameCount(44100)  // 1 second of silence
        guard
            let buffer = AVAudioPCMBuffer(
                pcmFormat: format,
                frameCapacity: frameCount
            )
        else {
            throw AlarmError.countdownLoopFailed
        }
        buffer.frameLength = frameCount  // zero-initialised = silence
        let outputFile = try AVAudioFile(
            forWriting: destURL,
            settings: format.settings
        )
        try outputFile.write(from: buffer)
        return destURL
    }

    private func makeCountdownSoundLoop(from sourceURL: URL) throws -> URL {
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
            throw AlarmError.countdownLoopFailed
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
                throw AlarmError.countdownLoopFailed
            }
            silenceBuffer.frameLength = remainingFrames
            try outputFile.write(from: silenceBuffer)
        }

        return destURL
    }

}
