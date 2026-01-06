//
//  OnboardingPickChallengeView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftData
import SwiftUI

struct OnboardingPickChallengeView: View {
    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext

    private let challenges = ChallengeRegistry.shared.all

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Title
            Text("Pick a color")
                .font(.erode(36, weight: .bold))

            Spacer().frame(height: 8)

            // Subtitle
            Text("Start your first dérive")
                .font(.body)
                .foregroundStyle(.secondary)

            Spacer().frame(height: 32)

            // Content (color grid)
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12),
                ],
                spacing: 12
            ) {
                ForEach(challenges) { challenge in
                    Button {
                        startDerive(challenge)
                    } label: {
                        VStack(spacing: 8) {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(challenge.color)
                                .aspectRatio(1, contentMode: .fit)

                            Text(challenge.title)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.primary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.top, 60)
        .padding(.bottom, 24)
        .background(Color.appBackground)
        .navigationBarHidden(true)
    }

    private func startDerive(_ challenge: Challenge) {
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
