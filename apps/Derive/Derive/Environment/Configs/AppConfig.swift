//
//  AppConfig.swift
//  Derive
//

import Foundation

enum AppConfig {
    static var appName: String {
        Bundle.main.infoDictionary?["CFBundleName"] as? String ?? "Derive"
    }

    static var bundleIdentifier: String {
        Bundle.main.bundleIdentifier ?? "com.buildergroup.Derive"
    }

    static var version: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    static var build: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }

    /// Default duration for challenges (7 days)
    static let defaultChallengeDuration: TimeInterval = 7 * 24 * 60 * 60

    /// Maximum image dimension when storing photos
    static let maxImageDimension: CGFloat = 1000

    /// Share grid image size (300px per cell × 3)
    static let shareImageSize: CGFloat = 900
}
