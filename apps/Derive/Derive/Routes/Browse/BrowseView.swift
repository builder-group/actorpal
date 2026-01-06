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
            VStack(alignment: .leading, spacing: 28) {
                featuredSection
                allChallengesSection
            }
            .padding()
        }
        .background(Color.deriveBackground.ignoresSafeArea())
        .navigationTitle("Discover")
        .navigationDestination(item: $selectedChallenge) { challenge in
            ChallengeDetailView(challenge: challenge)
        }
    }

    // MARK: - UI

    private var featuredSection: some View {
        let featured = registry.featured
        let accentColor = featured.color ?? .accentColor

        return Button {
            selectedChallenge = featured
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                // Featured header
                HStack {
                    Label("Featured", systemImage: "star.fill")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(accentColor))

                    Spacer()

                    Text("This Week")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(accentColor.opacity(0.12))

                // Content
                HStack(spacing: 16) {
                    ChallengeImageView(challenge: featured, size: 72)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(featured.prompt)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)

                        HStack(spacing: 12) {
                            Label(featured.durationText, systemImage: "clock")
                            Label("9 photos", systemImage: "square.grid.3x3")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Circle()
                        .fill(accentColor)
                        .frame(width: 40, height: 40)
                        .overlay {
                            Image(systemName: "arrow.right")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                        }
                }
                .padding()
            }
            .deriveCard()
        }
        .buttonStyle(.plain)
    }

    private var allChallengesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("All Prompts")
                .font(.title2)
                .fontWeight(.bold)

            VStack(spacing: 12) {
                ForEach(registry.all) { challenge in
                    if challenge.id != registry.featured.id {
                        challengeRow(challenge)
                    }
                }
            }
        }
    }

    private func challengeRow(_ challenge: Challenge) -> some View {
        let accentColor = challenge.color ?? .accentColor

        return Button {
            selectedChallenge = challenge
        } label: {
            HStack(spacing: 14) {
                ChallengeImageView(challenge: challenge, size: 56)

                VStack(alignment: .leading, spacing: 4) {
                    Text(challenge.prompt)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)

                    Text(challenge.durationText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(accentColor)
            }
            .padding(14)
            .deriveCard(cornerRadius: 16)
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
