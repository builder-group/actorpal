//
//  BrowseView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct BrowseView: View {
    @Binding var selectedTab: AppTab
    @State private var selectedChallenge: Challenge?

    private let challenges = ChallengeRegistry.shared.all

    // MARK: - UI

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                colorSection

                Spacer().frame(height: 32)

                soonSection

                Spacer().frame(height: 40)
            }
            .padding(.horizontal, 20)
        }
        .scrollIndicators(.hidden)
        .background(Color.appBackground)
        .navigationTitle("Discover")
        .navigationDestination(item: $selectedChallenge) { challenge in
            ChallengeDetailView(challenge: challenge, selectedTab: $selectedTab)
        }
    }

    private var colorSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Color")
                .font(.erode(24, weight: .semibold))

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12)
                ],
                spacing: 12
            ) {
                ForEach(challenges) { challenge in
                    challengeCard(challenge)
                }
            }
        }
    }

    private func challengeCard(_ challenge: Challenge) -> some View {
        Button {
            selectedChallenge = challenge
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

    private var soonSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Soon")
                .font(.erode(24, weight: .semibold))

            Text("More ways to explore coming soon — textures, shapes, themes, and beyond.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    NavigationStack {
        BrowseView(selectedTab: .constant(.discover))
    }
    .previewDataContainer()
}
