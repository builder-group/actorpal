import Foundation

enum CameraExtensionConstants {
    static let manufacturerName = "Builder Group"
    static let deviceName = "NoDox Camera"
    static let sourceStreamName = "NoDox Camera Output"
    static let sinkStreamName = "NoDox Camera Input"

    // Keep the published device identity stable across launches so AVFoundation
    // and CMIO clients can reconnect to the same virtual camera predictably.
    static let deviceID = UUID(
        uuidString: "BC964B06-D9AF-4D36-90D2-2E2E80A6E6E2"
    )!
    static let sourceStreamID = UUID(
        uuidString: "B74F68A4-1C52-4286-8AB8-0A214F5A37A5"
    )!
    static let sinkStreamID = UUID(
        uuidString: "CBAE56F7-0CB2-422E-9C20-E05F2BF975F2"
    )!

    static let width = 1920
    static let height = 1080
    static let frameRate = 30

    static var displayVersion: String {
        let marketingVersion =
            Bundle.main.object(
                forInfoDictionaryKey: "CFBundleShortVersionString"
            ) as? String ?? "0.0.0"
        let buildVersion =
            Bundle.main.object(
                forInfoDictionaryKey: kCFBundleVersionKey as String
            ) as? String ?? "0"
        return "\(marketingVersion) (\(buildVersion))"
    }

    static var fallbackTitle: String {
        "NoDox \(displayVersion)"
    }

    static let fallbackSubtitle = "Start screen capture in the NoDox app."
}
