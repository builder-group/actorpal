//
//  ChallengeDetailView.swift
//  Derive
//

import SwiftData
import SwiftUI

struct ChallengeDetailView: View {
    let challenge: Challenge

    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            challengePreview
            Spacer()
            startButton
        }
        .padding()
        .navigationTitle("Challenge")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - UI

    private var challengePreview: some View {
        VStack(spacing: 24) {
            ChallengeImageView(challenge: challenge, size: 120)

            VStack(spacing: 8) {
                Text(challenge.prompt)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)

                Label("\(challenge.durationText) to complete", systemImage: "clock")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var startButton: some View {
        Button(action: startDerive) {
            Text("Start Derive")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(challenge.color ?? .accentColor)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .disabled(player.hasActiveDerive)
    }

    // MARK: - Actions

    private func startDerive() {
        let derive = Derive(challengeId: challenge.id, player: player)
        modelContext.insert(derive)
        try? modelContext.save()
        dismiss()
    }
}

#Preview {
    NavigationStack {
        ChallengeDetailView(challenge: ChallengeRegistry.shared.featured)
    }
    .previewDataContainer()
}
