//
//  Challenge.swift
//  Derive
//

import SwiftUI

struct Challenge: Identifiable, Codable, Hashable {
    let id: String
    let prompt: String
    let duration: TimeInterval
    private let colorName: String

    init(id: String, prompt: String, duration: TimeInterval = 7.days, color: Color) {
        self.id = id
        self.prompt = prompt
        self.duration = duration
        self.colorName = id // Use id as color name since they match
    }

    // MARK: - Display

    var color: Color {
        switch colorName {
        case "yellow": return .yellow
        case "red": return .red
        case "blue": return .blue
        case "green": return .green
        case "orange": return .orange
        case "pink": return .pink
        default: return .accentColor
        }
    }

    var durationDays: Int {
        Int(duration / (24 * 60 * 60))
    }

    var durationText: String {
        "\(durationDays) days"
    }
}
