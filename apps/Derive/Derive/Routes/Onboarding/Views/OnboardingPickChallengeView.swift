//
//  OnboardingPickChallengeView.swift
//  Derive
//

import SwiftData
import SwiftUI

struct OnboardingPickChallengeView: View {
    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext

    private let registry = ChallengeRegistry.shared

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Text("Pick a Prompt")
                            .font(.largeTitle)
                            .fontWeight(.bold)

                        Text("Tap one to start your first derive")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 20)

                    // Challenge list
                    VStack(spacing: 12) {
                        ForEach(registry.all) { challenge in
                            challengeCard(challenge)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 40)
            }
        }
        .background(Color.deriveBackground.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func challengeCard(_ challenge: Challenge) -> some View {
        let accentColor = challenge.color ?? .accentColor

        return Button {
            startDerive(with: challenge)
        } label: {
            HStack(spacing: 16) {
                // Image
                ChallengeImageView(challenge: challenge, size: 60)

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(challenge.prompt)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: 8) {
                        Label(challenge.durationText, systemImage: "clock")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Arrow
                Circle()
                    .fill(accentColor)
                    .frame(width: 36, height: 36)
                    .overlay {
                        Image(systemName: "arrow.right")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                    }
            }
            .padding(16)
            .deriveCard()
        }
        .buttonStyle(.plain)
    }

    private func startDerive(with challenge: Challenge) {
        let derive = Derive(challengeId: challenge.id, player: player)
        modelContext.insert(derive)
        player.onboardingCompletedAt = Date()
        try? modelContext.save()
    }
}

#Preview {
    NavigationStack {
        OnboardingPickChallengeView()
    }
    .previewDataContainer()
}
