//
//  Challenge.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct Challenge: Identifiable, Codable, Hashable {
    let id: String
    let type: String
    let prompt: String

    init(id: String, type: String = "color", prompt: String) {
        self.id = id
        self.type = type
        self.prompt = prompt
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
