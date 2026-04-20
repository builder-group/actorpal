//
//  AppConfig.swift
//  Nodox
//
//  Created by Benno on 19.04.26.
//

import Foundation

enum AppConfig {
    static let appName = "NoDox"
    static let cameraExtensionIdentifier =
        "com.buildergroup.nodox.camera-extension"

    static let virtualCameraDeviceName = "NoDox Camera"
    static let virtualCameraSinkStreamName = "NoDox Camera Input"

    static let videoWidth = 1920
    static let videoHeight = 1080
    static let videoFrameRate = 30

    // Maximum rate at which VisionTextDetector runs a new recognition request.
    // 0.1 s = 10 Hz, leaving plenty of CPU headroom alongside the 30 fps capture pipeline.
    static let visionThrottleInterval: TimeInterval = 0.1

    static var marketingVersion: String {
        bundleValue(for: "CFBundleShortVersionString", fallback: "0.0.0")
    }

    static var buildVersion: String {
        bundleValue(for: kCFBundleVersionKey as String, fallback: "0")
    }

    static var displayVersion: String {
        "\(marketingVersion) (\(buildVersion))"
    }

    static var versionLabel: String {
        "Version \(displayVersion)"
    }

    private static func bundleValue(for key: String, fallback: String) -> String
    {
        Bundle.main.object(forInfoDictionaryKey: key) as? String ?? fallback
    }
}
