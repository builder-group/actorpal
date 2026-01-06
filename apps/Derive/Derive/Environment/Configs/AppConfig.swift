//
//  AppConfig.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import Foundation

enum AppConfig {
    // MARK: - App Information

    static var appName: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName")
            as? String
            ?? Bundle.main.object(forInfoDictionaryKey: "CFBundleName")
            as? String
            ?? "Derive"
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

    // MARK: - External Links

    static var websiteURL: URL? {
        URL(string: "https://tapling.app")
    }

    static var appStoreURL: URL? {
        nil // TODO: Add App Store URL after release
    }

    static var privacyPolicyURL: URL? {
        URL(string: "https://tapling.app/privacy")
    }

    static var githubURL: URL? {
        URL(string: "https://github.com/builder-group/lab")
    }

    // MARK: - Feedback & Support

    static var feedbackEmail: String {
        "feedback@tapling.app"
    }

    static func mailtoURL(subject: String) -> URL? {
        let encodedSubject =
            subject.addingPercentEncoding(
                withAllowedCharacters: .urlQueryAllowed
            ) ?? subject
        return URL(string: "mailto:\(feedbackEmail)?subject=\(encodedSubject)")
    }

    // MARK: - Challenge Configuration

    /// Default duration for challenges (7 days)
    static let defaultChallengeDuration: TimeInterval = 7 * 24 * 60 * 60

    /// Maximum image dimension when storing photos
    static let maxImageDimension: CGFloat = 1000
}
