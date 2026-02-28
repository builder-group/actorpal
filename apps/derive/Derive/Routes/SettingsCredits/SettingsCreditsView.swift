//
//  SettingsCreditsView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct SettingsCreditsView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection
                creditsSection
            }
        }
        .background(Color.appBackground)
        .navigationTitle("Credits")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var headerSection: some View {
        VStack(spacing: 16) {
            Image("logo")
                .font(.system(size: 48))
                .foregroundStyle(.primary)

            VStack(spacing: 4) {
                Text("Dérive is inspired by amazing people")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.primary)

                Text("We're grateful for their work")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)
        }
        .padding(.top, 8)
    }

    private var creditsSection: some View {
        SectionContainerView {
            if let debordURL = URL(string: "https://en.wikipedia.org/wiki/D%C3%A9rive") {
                LinkRowView(
                    icon: "book.fill",
                    iconColor: .orange,
                    title: "Guy Debord",
                    subtitle: "Theory of the Dérive (1956)",
                    url: debordURL
                )

                SectionDivider()
            }

            if let tweetURL = URL(string: "https://x.com/malisauskasLT/status/2008123520727867451") {
                LinkRowView(
                    icon: "sparkles",
                    iconColor: .yellow,
                    title: "@malisauskasLT",
                    subtitle: "Color hunting inspiration",
                    url: tweetURL
                )
            }
        }
    }
}

// MARK: - Helper Views

private struct SectionContainerView<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: 0) {
            content
        }
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.appCard)
        )
        .padding(.horizontal)
    }
}

private struct SectionDivider: View {
    var body: some View {
        Divider()
            .padding(.leading, 56)
    }
}

private struct LinkRowView: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    let url: URL

    var body: some View {
        Link(destination: url) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(iconColor)
                    .frame(width: 32, height: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body)
                        .foregroundStyle(.primary)

                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "arrow.up.forward")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NavigationStack {
        SettingsCreditsView()
    }
}
