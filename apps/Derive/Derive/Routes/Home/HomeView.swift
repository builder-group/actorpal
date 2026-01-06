//
//  HomeView.swift
//  Derive
//

import SwiftData
import SwiftUI

struct HomeView: View {
    @QuerySingleton private var player: Player

    var body: some View {
        Group {
            if let derive = player.activeDerive {
                DeriveView(derive: derive)
            } else {
                emptyState
            }
        }
        .navigationTitle("Derive")
    }

    // MARK: - UI

    private var emptyState: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "square.grid.3x3")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)

            VStack(spacing: 8) {
                Text("No active derive")
                    .font(.headline)

                Text("Start a challenge from the Discover tab")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding()
    }
}

#Preview("Empty") {
    NavigationStack {
        HomeView()
    }
    .previewDataContainer()
}

#Preview("With Active") {
    NavigationStack {
        HomeView()
    }
    .previewDataContainer { context in
        let player = Player.instance(with: context)
        let derive = Derive(challengeId: "yellow", player: player)
        context.insert(derive)
    }
}
