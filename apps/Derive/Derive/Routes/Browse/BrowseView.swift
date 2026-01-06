//
//  BrowseView.swift
//  Derive
//

import SwiftData
import SwiftUI

struct BrowseView: View {
    @QuerySingleton private var player: Player
    @State private var selectedChallenge: Challenge?

    private let registry = ChallengeRegistry.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                featuredSection
                allChallengesSection
            }
            .padding()
        }
        .navigationTitle("Discover")
        .navigationDestination(item: $selectedChallenge) { challenge in
            ChallengeDetailView(challenge: challenge)
        }
    }

    // MARK: - UI

    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Featured", systemImage: "star.fill")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            challengeCard(registry.featured, isFeatured: true)
        }
    }

    private var allChallengesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("All Challenges")
                .font(.headline)

            ForEach(registry.all) { challenge in
                if challenge.id != registry.featured.id {
                    challengeCard(challenge, isFeatured: false)
                }
            }
        }
    }

    private func challengeCard(_ challenge: Challenge, isFeatured: Bool) -> some View {
        Button {
            selectedChallenge = challenge
        } label: {
            HStack(spacing: 16) {
                ChallengeImageView(
                    challenge: challenge,
                    size: isFeatured ? 80 : 60
                )

                VStack(alignment: .leading, spacing: 4) {
                    Text(challenge.prompt)
                        .font(isFeatured ? .headline : .subheadline)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)

                    Text(challenge.durationText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding()
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NavigationStack {
        BrowseView()
    }
    .previewDataContainer()
}
