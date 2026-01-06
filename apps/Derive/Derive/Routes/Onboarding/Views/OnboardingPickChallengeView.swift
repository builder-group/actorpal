//
//  OnboardingPickChallengeView.swift
//  Derive
//

import SwiftData
import SwiftUI

struct OnboardingPickChallengeView: View {
    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext

    private let challenges = ChallengeRegistry.shared.all

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Pick a color")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.horizontal)

            Text("Start your first derive")
                .foregroundStyle(.secondary)
                .padding(.horizontal)
                .padding(.top, 8)

            Spacer()
                .frame(height: 24)

            ScrollView {
                LazyVGrid(
                    columns: [GridItem(.flexible()), GridItem(.flexible())],
                    spacing: 16
                ) {
                    ForEach(challenges) { challenge in
                        Button {
                            startDerive(challenge)
                        } label: {
                            VStack(spacing: 12) {
                                Circle()
                                    .fill(challenge.color)
                                    .frame(width: 60, height: 60)

                                Text(challenge.id.capitalized)
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
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
