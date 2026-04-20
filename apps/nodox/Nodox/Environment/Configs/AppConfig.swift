//
//  AppConfig.swift
//  Nodox
//
//  Created by Benno on 19.04.26.
//

import CoreGraphics
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

    static let overlayInset: CGFloat = 72
    static let overlaySize = CGSize(width: 280, height: 144)

    static var overlayRect: CGRect {
        CGRect(
            x: overlayInset,
            y: overlayInset,
            width: overlaySize.width,
            height: overlaySize.height
        )
    }

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

    static var overlayLabel: String {
        "\(appName) \(displayVersion)"
    }

    private static func bundleValue(for key: String, fallback: String) -> String
    {
        Bundle.main.object(forInfoDictionaryKey: key) as? String ?? fallback
    }
}
