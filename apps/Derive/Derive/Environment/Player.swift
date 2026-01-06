//
//  Player.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import Foundation
import SwiftData

/// Singleton model representing the player.
/// Owns all derives and tracks player state.
@Model
final class Player: SingletonModel {
    var createdAt: Date
    var onboardingCompletedAt: Date?

    @Relationship(deleteRule: .cascade, inverse: \Derive.player)
    var derives: [Derive] = []

    init(createdAt: Date = Date()) {
        self.createdAt = createdAt
    }

    static var `default`: Player {
        Player()
    }

    // MARK: - Onboarding

    var hasCompletedOnboarding: Bool {
        onboardingCompletedAt != nil
    }

    // MARK: - Derives

    /// The currently active derive (not completed, not expired)
    var activeDerive: Derive? {
        derives.first { $0.isActive }
    }

    /// All completed derives, sorted by completion date (newest first)
    var completedDerives: [Derive] {
        derives
            .filter { $0.completedAt != nil }
            .sorted { ($0.completedAt ?? .distantPast) > ($1.completedAt ?? .distantPast) }
    }

    /// Whether the player currently has an active derive
    var hasActiveDerive: Bool {
        activeDerive != nil
    }
}
