import AVFoundation
import ExpoModulesCore

public class AlarmModule: Module {
    private let onAlarmNotificationTapped = "onAlarmNotificationTapped"
    private let notificationRuntime = AlarmNotificationRuntime.shared
    private let backgroundAudioRuntime = AlarmBackgroundAudioRuntime(
        notificationRuntime: AlarmNotificationRuntime.shared
    )
    private var lastTappedNotification: [String: String]?
    private var previewPlayer: AVAudioPlayer?

    public func definition() -> ModuleDefinition {
        Name("Alarm")
        Events(onAlarmNotificationTapped)

        OnCreate {
            self.notificationRuntime.setTapHandler { [weak self] identifier in
                guard let self else {
                    return
                }

                let payload = ["identifier": identifier]
                self.lastTappedNotification = payload
                self.sendEvent(self.onAlarmNotificationTapped, payload)
            }
        }

        OnDestroy {
            self.notificationRuntime.setTapHandler(nil)
        }

        AsyncFunction("startBackgroundSession") {
            (
                durationMs: Double,
                countdownSoundFile: String?,
                endSoundName: String,
                nativeAlarm: Bool,
                notificationId: String
            ) async throws in
            try await self.backgroundAudioRuntime.startSession(
                durationMs: durationMs,
                countdownSoundFile: countdownSoundFile,
                endSoundName: endSoundName,
                nativeAlarm: nativeAlarm,
                notificationId: notificationId
            )
        }

        Function("stopBackgroundSession") {
            self.backgroundAudioRuntime.stopSession(cancelNotification: true)
        }

        AsyncFunction("requestAlarmPermission") { () async -> Bool in
            guard
                let granted = try? await self.notificationRuntime
                    .requestPermission()
            else {
                return false
            }
            return granted
        }

        AsyncFunction("getNotificationPermissionStatus") { () async -> String in
            await self.notificationRuntime.getPermissionStatus()
        }

        AsyncFunction("scheduleAlarm") {
            (id: String, endTimeMs: Double, soundFile: String) async throws in
            self.notificationRuntime.cancel(identifier: id)
            try await self.notificationRuntime.schedule(
                identifier: id,
                endTimeMs: endTimeMs,
                soundFile: soundFile
            )
        }

        AsyncFunction("prepareNotificationSound") {
            (soundName: String) -> String in
            guard let sourceURL = SoundLibrary.resolveURL(for: soundName) else {
                throw AlarmError.soundNotFound(soundName)
            }
            return try self.notificationRuntime.prepareNotificationSound(
                from: sourceURL,
                named: soundName
            )
        }

        AsyncFunction("previewSessionSound") {
            (soundFile: String) async throws in
            guard
                let url = self.backgroundAudioRuntime.resolveCountdownSoundURL(
                    named: soundFile
                )
            else {
                throw AlarmError.soundNotFound(soundFile)
            }
            try await MainActor.run { try self.playPreview(url: url) }
        }

        AsyncFunction("previewEndSound") { (soundName: String) async throws in
            guard let url = SoundLibrary.resolveURL(for: soundName) else {
                throw AlarmError.soundNotFound(soundName)
            }
            try await MainActor.run { try self.playPreview(url: url) }
        }

        AsyncFunction("cancelAlarm") { (id: String) in
            self.notificationRuntime.cancel(identifier: id)
        }

        Function("consumePendingNotificationTap") {
            () -> [String: String]? in
            let tap = self.lastTappedNotification
            self.lastTappedNotification = nil
            return tap
        }
    }

    @MainActor
    private func playPreview(url: URL) throws {
        previewPlayer?.stop()
        let player = try AVAudioPlayer(contentsOf: url)
        player.prepareToPlay()
        player.play()
        previewPlayer = player
    }
}

// MARK: - Errors

enum AlarmError: LocalizedError {
    case soundNotFound(String)
    case countdownLoopFailed

    var errorDescription: String? {
        switch self {
        case .soundNotFound(let name):
            return "Sound '\(name)' not found."
        case .countdownLoopFailed:
            return "Unable to create the countdown sound loop."
        }
    }
}
