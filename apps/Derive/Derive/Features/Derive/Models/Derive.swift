//
//  Derive.swift
//  Derive
//

import Foundation
import SwiftData

/// A player's instance of doing a challenge.
/// Created when the player joins a challenge, contains their photos and progress.
@Model
final class Derive {
    var id: UUID
    var challengeId: String
    var startedAt: Date
    var completedAt: Date?
    var sharedAt: Date?

    /// Photos stored as JSON-encoded Data for SwiftData compatibility
    var photosData: Data?

    @Relationship
    var player: Player?

    /// Access photos as [PhotoSlot] array
    var photos: [PhotoSlot] {
        get {
            guard let data = photosData else {
                return (0..<9).map { _ in PhotoSlot() }
            }
            return (try? JSONDecoder().decode([PhotoSlot].self, from: data))
                ?? (0..<9).map { _ in PhotoSlot() }
        }
        set {
            photosData = try? JSONEncoder().encode(newValue)
        }
    }

    init(
        id: UUID = UUID(),
        challengeId: String,
        player: Player
    ) {
        self.id = id
        self.challengeId = challengeId
        self.startedAt = Date()
        self.photosData = try? JSONEncoder().encode((0..<9).map { _ in PhotoSlot() })
        self.player = player
    }

    // MARK: - Challenge Reference

    /// The challenge template this derive is based on
    var challenge: Challenge? {
        ChallengeRegistry.shared.challenge(id: challengeId)
    }

    var prompt: String {
        challenge?.prompt ?? "Unknown challenge"
    }

    var duration: TimeInterval {
        challenge?.duration ?? AppConfig.defaultChallengeDuration
    }

    // MARK: - Time

    var endsAt: Date {
        startedAt.addingTimeInterval(duration)
    }

    var timeRemaining: TimeInterval {
        max(0, endsAt.timeIntervalSinceNow)
    }

    var isExpired: Bool {
        completedAt == nil && timeRemaining <= 0
    }

    var isActive: Bool {
        completedAt == nil && !isExpired
    }

    // MARK: - Progress

    var filledCount: Int {
        photos.filter { $0.isFilled }.count
    }

    var isComplete: Bool {
        filledCount == 9
    }

    var canShare: Bool {
        isComplete
    }

    var progressText: String {
        "\(filledCount)/9"
    }
}
