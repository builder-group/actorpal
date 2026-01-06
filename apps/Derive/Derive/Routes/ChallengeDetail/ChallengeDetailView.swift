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

    private var accentColor: Color {
        challenge.color ?? .accentColor
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                headerSection
                gridPreview
                infoSection
            }
            .padding()
            .padding(.bottom, 100)
        }
        .background(Color.deriveBackground.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 12) {
                if player.hasActiveDerive {
                    activeWarning
                }
                startButton
            }
            .padding()
            .background(
                Color.deriveBackground
                    .shadow(color: .black.opacity(0.05), radius: 10, y: -5)
                    .ignoresSafeArea()
            )
        }
        .navigationTitle("Challenge")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - UI

    private var headerSection: some View {
        VStack(spacing: 20) {
            ChallengeImageView(challenge: challenge, size: 100)

            VStack(spacing: 12) {
                Text(challenge.prompt)
                    .font(.title2)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)

                HStack(spacing: 16) {
                    statBadge(icon: "clock", value: challenge.durationText)
                    statBadge(icon: "square.grid.3x3", value: "9 photos")
                }
            }
        }
        .padding(.top, 8)
    }

    private func statBadge(icon: String, value: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(Color.deriveSand.opacity(0.6))
        .clipShape(Capsule())
    }

    private var gridPreview: some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 3)

        return VStack(alignment: .leading, spacing: 12) {
            Text("Your Grid")
                .font(.headline)

            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(0 ..< 9, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.deriveSand.opacity(0.5))
                        .aspectRatio(1, contentMode: .fit)
                        .overlay(
                            Circle()
                                .fill(Color(.systemBackground))
                                .frame(width: 28, height: 28)
                                .overlay {
                                    Image(systemName: "plus")
                                        .font(.caption)
                                        .foregroundStyle(accentColor.opacity(0.5))
                                }
                        )
                }
            }
            .padding(16)
            .deriveCard()
        }
    }

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("How it works")
                .font(.headline)

            VStack(spacing: 8) {
                infoRow(icon: "camera", text: "Take photos during your walks", color: .deriveTerracotta)
                infoRow(icon: "clock", text: "Fill all 9 slots before time runs out", color: .deriveSage)
                infoRow(icon: "square.and.arrow.up", text: "Share your completed grid", color: .deriveLavender)
            }
            .padding(16)
            .deriveCard()
        }
    }

    private func infoRow(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.2))
                    .frame(width: 32, height: 32)

                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(color)
            }

            Text(text)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()
        }
    }

    private var activeWarning: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(.orange)

            Text("Complete your current derive first")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity)
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var startButton: some View {
        Button(action: startDerive) {
            HStack {
                Text("Start Derive")
                Image(systemName: "arrow.right")
            }
        }
        .buttonStyle(.derivePrimary(color: player.hasActiveDerive ? Color(.systemGray4) : accentColor))
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
