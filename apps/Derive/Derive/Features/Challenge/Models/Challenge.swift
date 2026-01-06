//
//  Challenge.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct Challenge: Identifiable, Codable, Hashable {
    let id: String
    let prompt: String
    let duration: TimeInterval?

    init(id: String, prompt: String, duration: TimeInterval? = nil) {
        self.id = id
        self.prompt = prompt
        self.duration = duration
    }

    // MARK: - Display

    var title: String {
        id.capitalized
    }

    var color: Color {
        switch id {
        case "yellow": return .yellow
        case "red": return .red
        case "blue": return .blue
        case "green": return .green
        case "orange": return .orange
        case "pink": return .pink
        case "purple": return .purple
        case "brown": return .brown
        default: return .accentColor
        }
    }
}
