//
//  Challenge.swift
//  Derive
//

import Foundation
import SwiftUI

struct Challenge: Identifiable, Codable, Hashable {
    let id: String
    let prompt: String
    let duration: TimeInterval
    let themeColor: String?

    init(
        id: String,
        prompt: String,
        duration: TimeInterval = AppConfig.defaultChallengeDuration,
        themeColor: String? = nil
    ) {
        self.id = id
        self.prompt = prompt
        self.duration = duration
        self.themeColor = themeColor
    }

    // MARK: - Asset

    /// Asset name for the challenge image
    /// Place images in: Assets.xcassets/challenges/challenge_{id}.imageset
    var imageName: String {
        "challenge_\(id)"
    }

    // MARK: - Display

    var color: Color? {
        guard let themeColor else { return nil }
        switch themeColor {
        case "yellow": return .yellow
        case "red": return .red
        case "blue": return .blue
        case "green": return .green
        case "orange": return .orange
        case "pink": return .pink
        default: return nil
        }
    }

    var durationDays: Int {
        Int(duration / (24 * 60 * 60))
    }

    var durationText: String {
        "\(durationDays) days"
    }
}
