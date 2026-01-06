//
//  ChallengeRegistry.swift
//  Derive
//

import SwiftUI

struct ChallengeRegistry {
    static let shared = ChallengeRegistry()
    private init() {}

    // Only color challenges for now
    let all: [Challenge] = [
        Challenge(id: "yellow", prompt: "Find 9 yellow things", color: .yellow),
        Challenge(id: "red", prompt: "Find 9 red things", color: .red),
        Challenge(id: "blue", prompt: "Find 9 blue things", color: .blue),
        Challenge(id: "green", prompt: "Find 9 green things", color: .green),
        Challenge(id: "orange", prompt: "Find 9 orange things", color: .orange),
        Challenge(id: "pink", prompt: "Find 9 pink things", color: .pink),
    ]

    func challenge(id: String) -> Challenge? {
        all.first { $0.id == id }
    }

    var featured: Challenge {
        let weekNumber = Calendar.current.component(.weekOfYear, from: Date())
        return all[weekNumber % all.count]
    }
}

// MARK: - Time Helpers

extension Int {
    var days: TimeInterval {
        TimeInterval(self * 24 * 60 * 60)
    }
}
