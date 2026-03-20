import AVFoundation
import ExpoModulesCore
import Foundation
import UserNotifications

final class AlarmNotificationRuntime: NSObject, UNUserNotificationCenterDelegate
{
    static let shared = AlarmNotificationRuntime()
    static let timerAlarmUserInfo: [AnyHashable: Any] = [
        "kairosNotificationSource": "timerAlarm"
    ]

    private var tapHandler: ((String) -> Void)?
    private var pendingTappedIdentifiers: [String] = []

    private override init() {
        super.init()
    }

    func installAsDelegate() {
        let center = UNUserNotificationCenter.current()
        if let delegate = center.delegate, delegate !== self {
            NSLog(
                "[kairos-alarm] UNUserNotificationCenter already has a delegate. Alarm notification hooks may not run."
            )
            return
        }

        center.delegate = self
    }

    func setTapHandler(_ handler: ((String) -> Void)?) {
        DispatchQueue.main.async {
            self.tapHandler = handler
            self.flushPendingTappedNotifications()
        }
    }

    func requestPermission() async throws -> Bool {
        try await UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .timeSensitive]
        )
    }

    func getPermissionStatus() async -> String {
        let settings = await UNUserNotificationCenter.current()
            .notificationSettings()

        switch settings.authorizationStatus {
        case .notDetermined:
            return "notDetermined"
        case .denied:
            return "denied"
        case .authorized:
            return "authorized"
        case .provisional:
            return "provisional"
        case .ephemeral:
            return "ephemeral"
        @unknown default:
            return "denied"
        }
    }

    func schedule(identifier: String, endTimeMs: Double, soundFile: String?)
        async throws
    {
        let content = UNMutableNotificationContent()
        content.title = "Time's up"
        if let soundFile {
            content.sound = UNNotificationSound(
                named: UNNotificationSoundName(rawValue: soundFile)
            )
        }
        content.interruptionLevel = .timeSensitive
        content.userInfo = Self.timerAlarmUserInfo

        let endDate = Date(timeIntervalSince1970: endTimeMs / 1000)
        let comps = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute, .second],
            from: endDate
        )
        let trigger = UNCalendarNotificationTrigger(
            dateMatching: comps,
            repeats: false
        )
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )
        try await UNUserNotificationCenter.current().add(request)
    }

    /// Loops the given sound to fill ~29 seconds and writes it to Library/Sounds/
    /// so it can be referenced by name in a UNNotificationSound.
    func prepareNotificationSound(from sourceURL: URL, named soundName: String)
        throws -> String
    {
        let maxDuration: TimeInterval = 29
        let sourceFile = try AVAudioFile(forReading: sourceURL)
        let format = sourceFile.processingFormat
        let sourceFrames = AVAudioFrameCount(sourceFile.length)
        let sourceDuration = Double(sourceFrames) / format.sampleRate
        let repetitions = max(1, Int(ceil(maxDuration / sourceDuration)))

        let fm = FileManager.default
        let soundsDir = fm.urls(for: .libraryDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Sounds", isDirectory: true)
        try fm.createDirectory(at: soundsDir, withIntermediateDirectories: true)
        let outputName = "\(soundName).caf"
        let destURL = soundsDir.appendingPathComponent(outputName)
        if fm.fileExists(atPath: destURL.path) {
            try fm.removeItem(at: destURL)
        }

        let outputFile = try AVAudioFile(
            forWriting: destURL,
            settings: format.settings
        )
        let maxOutputFrames = AVAudioFrameCount(maxDuration * format.sampleRate)
        var writtenFrames: AVAudioFrameCount = 0

        for _ in 0..<repetitions {
            guard writtenFrames < maxOutputFrames else { break }
            sourceFile.framePosition = 0
            let remaining = maxOutputFrames - writtenFrames
            let framesToRead = min(sourceFrames, remaining)
            guard
                let buffer = AVAudioPCMBuffer(
                    pcmFormat: format,
                    frameCapacity: framesToRead
                )
            else { break }
            try sourceFile.read(into: buffer, frameCount: framesToRead)
            buffer.frameLength = framesToRead
            try outputFile.write(from: buffer)
            writtenFrames += framesToRead
        }

        return outputName
    }

    func cancel(identifier: String) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [identifier])
        center.removeDeliveredNotifications(withIdentifiers: [identifier])
    }

    private func flushPendingTappedNotifications() {
        guard let tapHandler else {
            return
        }

        let pending = self.pendingTappedIdentifiers
        self.pendingTappedIdentifiers.removeAll()
        for identifier in pending {
            tapHandler(identifier)
        }
    }

    private func isTimerAlarm(_ notification: UNNotification) -> Bool {
        (notification.request.content.userInfo["kairosNotificationSource"]
            as? String) == "timerAlarm"
    }

    private func handleTappedNotification(identifier: String) {
        dispatchPrecondition(condition: .onQueue(.main))
        if let tapHandler {
            tapHandler(identifier)
            return
        }

        pendingTappedIdentifiers.append(identifier)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler:
            @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        if isTimerAlarm(notification) {
            // Suppress foreground presentation so the timer screen remains the only visible surface.
            completionHandler([])
            return
        }

        completionHandler([.banner, .list, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if isTimerAlarm(response.notification) {
            handleTappedNotification(
                identifier: response.notification.request.identifier
            )
        }

        completionHandler()
    }
}

public final class AlarmAppDelegateSubscriber: ExpoAppDelegateSubscriber {
    public func subscriberDidRegister() {
        AlarmNotificationRuntime.shared.installAsDelegate()
    }
}
