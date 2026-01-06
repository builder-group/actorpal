//
//  BrowseView.swift
//  Derive
//

import SwiftData
import SwiftUI

struct BrowseView: View {
    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext

    private let challenges = ChallengeRegistry.shared.all

    var body: some View {
        List {
            if player.hasActiveDerive {
                activeWarningSection
            }

            challengesSection
        }
        .navigationTitle("Discover")
    }

    // MARK: - UI

    private var activeWarningSection: some View {
        Section {
            Label("You have an active derive", systemImage: "info.circle")
                .foregroundStyle(.secondary)
        }
    }

    private var challengesSection: some View {
        Section("COLOR CHALLENGES") {
            ForEach(challenges) { challenge in
                Button {
                    startDerive(challenge)
                } label: {
                    HStack(spacing: 16) {
                        Circle()
                            .fill(challenge.color)
                            .frame(width: 40, height: 40)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(challenge.prompt)
                                .foregroundStyle(.primary)

                            Text(challenge.durationText)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        if !player.hasActiveDerive {
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
                .disabled(player.hasActiveDerive)
            }
        }
    }

    // MARK: - Actions

    private func startDerive(_ challenge: Challenge) {
        let derive = Derive(challengeId: challenge.id, player: player)
        modelContext.insert(derive)
        try? modelContext.save()
    }
}

#Preview {
    NavigationStack {
        BrowseView()
    }
    .previewDataContainer()
}
