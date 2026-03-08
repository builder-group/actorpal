//
//  ChallengeRegistry.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct ChallengeRegistry {
    static let shared = ChallengeRegistry()
    private init() {}

    let all: [Challenge] = [
        Challenge(id: "yellow", prompt: "find things in yellow"),
        Challenge(id: "red", prompt: "find things in red"),
        Challenge(id: "blue", prompt: "find things in blue"),
        Challenge(id: "green", prompt: "find things in green"),
        Challenge(id: "orange", prompt: "find things in orange"),
        Challenge(id: "pink", prompt: "find things in pink"),
        Challenge(id: "purple", prompt: "find things in purple"),
        Challenge(id: "brown", prompt: "find things in brown"),
    ]

    func challenge(id: String) -> Challenge? {
        all.first { $0.id == id }
    }
}
