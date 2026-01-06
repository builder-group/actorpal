//
//  ChallengeDetailView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftData
import SwiftUI

struct ChallengeDetailView: View {
    let challenge: Challenge
    @Binding var selectedTab: AppTab
    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var showAbandonConfirm = false

    // MARK: - UI

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                colorPreview

                Spacer().frame(height: 24)

                promptLabel

                Spacer().frame(height: 32)

                infoSection

                Spacer().frame(height: 40)
            }
            .padding(.horizontal, 24)
        }
        .scrollIndicators(.hidden)
        .background(Color.appBackground)
        .navigationTitle(challenge.title)
        .safeAreaInset(edge: .bottom) {
            startButton
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
                .background(Color.appBackground)
        }
    }

    private var colorPreview: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(challenge.color)
            .frame(height: 200)
    }

    private var promptLabel: some View {
        Text(challenge.prompt)
            .font(.body)
            .foregroundStyle(.secondary)
    }

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            infoRow(icon: "square.grid.3x3", title: "9 Photos", subtitle: "Fill a 3×3 grid")
            infoRow(icon: "clock", title: "Take your time", subtitle: "No time limit")
            infoRow(icon: "eye", title: "Look around", subtitle: "Find the color in your world")
        }
    }

    private func infoRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.secondary)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.medium))
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var startButton: some View {
        Button {
            if player.hasActiveDerive {
                showAbandonConfirm = true
            } else {
                startDerive()
            }
        } label: {
            Text("Start Dérive")
                .font(.headline)
                .foregroundStyle(Color.appCtaContent)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.appCta)
                .clipShape(Capsule())
        }
        .alert("Abandon current dérive?", isPresented: $showAbandonConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Abandon & Start", role: .destructive) {
                abandonAndStartDerive()
            }
        } message: {
            Text("Your current progress will be lost.")
        }
    }

    // MARK: - Actions

    private func startDerive() {
        let derive = Derive(challengeId: challenge.id, player: player)
        modelContext.insert(derive)
        try? modelContext.save()
        dismiss()
        selectedTab = .derive
    }

    private func abandonAndStartDerive() {
        if let activeDerive = player.activeDerive {
            modelContext.delete(activeDerive)
        }
        startDerive()
    }
}

#Preview {
    NavigationStack {
        ChallengeDetailView(
            challenge: Challenge(id: "yellow", prompt: "Find 9 things in yellow"),
            selectedTab: .constant(.discover)
        )
    }
    .previewDataContainer()
}

#Preview("Has Active") {
    NavigationStack {
        ChallengeDetailView(
            challenge: Challenge(id: "blue", prompt: "Find 9 things in blue"),
            selectedTab: .constant(.discover)
        )
    }
    .previewDataContainer { ctx in
        let player = Player.instance(with: ctx)
        ctx.insert(Derive(challengeId: "yellow", player: player))
    }
}
