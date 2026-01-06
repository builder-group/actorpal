//
//  ChallengeRegistry.swift
//  Derive
//

import Foundation

struct ChallengeRegistry {
    static let shared = ChallengeRegistry()
    private init() {}

    let all: [Challenge] = [
        Challenge(
            id: "yellow",
            prompt: "Find 9 things in yellow",
            duration: 5.days,
            themeColor: "yellow"
        ),
        Challenge(
            id: "red",
            prompt: "Find 9 things in red",
            duration: 5.days,
            themeColor: "red"
        ),
        Challenge(
            id: "circles",
            prompt: "Find 9 circles",
            duration: 7.days
        ),
        Challenge(
            id: "shadows",
            prompt: "Find 9 interesting shadows",
            duration: 7.days
        ),
        Challenge(
            id: "lonely",
            prompt: "Find 9 lonely objects",
            duration: 10.days
        ),
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
