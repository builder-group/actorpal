//
//  SettingsAboutView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct SettingsAboutView: View {
    private enum FeedbackSubject {
        static let general = "Dérive Feedback"
        static let feature = "Feature Request"
        static let bug = "Bug Report"
    }

    // MARK: - UI

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection
                feedbackSection
                linksSection
                privacySection
                versionSection
            }
        }
        .background(Color.appBackground)
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var headerSection: some View {
        VStack(spacing: 16) {
            AboutLogoView()

            VStack(spacing: 4) {
                Text("A reason to look up from your phone")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.primary)

                Text("We'd love to hear your feedback!")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)
        }
        .padding(.top, 8)
    }

    private var feedbackSection: some View {
        SectionContainerView {
            ActionRowView(
                icon: "envelope.fill",
                iconColor: .blue,
                title: "Feedback",
                action: { openMail(subject: FeedbackSubject.general) }
            )

            SectionDivider()

            ActionRowView(
                icon: "gift.fill",
                iconColor: .pink,
                title: "Request a Feature",
                action: { openMail(subject: FeedbackSubject.feature) }
            )

            SectionDivider()

            ActionRowView(
                icon: "ladybug.fill",
                iconColor: .red,
                title: "Report a Bug",
                action: { openMail(subject: FeedbackSubject.bug) }
            )
        }
    }

    private var linksSection: some View {
        SectionContainerView {
            if let url = AppConfig.appStoreURL {
                LinkRowView(
                    icon: "apple.logo",
                    iconColor: .primary,
                    title: "App Store",
                    url: url
                )

                SectionDivider()
            }

            if let url = AppConfig.websiteURL {
                LinkRowView(
                    icon: "safari.fill",
                    iconColor: .blue,
                    title: "Website",
                    url: url
                )

                SectionDivider()
            }

            if let url = AppConfig.githubURL {
                LinkRowView(
                    icon: "github",
                    iconColor: .primary,
                    title: "GitHub",
                    url: url,
                    isSystemIcon: false
                )
            }
        }
    }

    @ViewBuilder
    private var privacySection: some View {
        if let privacyURL = AppConfig.privacyPolicyURL {
            SectionContainerView {
                LinkRowView(
                    icon: "hand.raised.fill",
                    iconColor: .blue,
                    title: "Privacy Policy",
                    url: privacyURL
                )
            }
        }
    }

    private var versionSection: some View {
        VStack(spacing: 4) {
            Text("Version \(AppConfig.version) (\(AppConfig.build))")
                .font(.caption)
                .foregroundStyle(.secondary)

            Text("© 2025 builder.group")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding(.top, 8)
        .padding(.bottom, 24)
    }

    // MARK: - Actions

    private func openMail(subject: String) {
        guard let url = AppConfig.mailtoURL(subject: subject) else { return }
        UIApplication.shared.open(url)
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

private struct ActionRowView: View {
    let icon: String
    let iconColor: Color
    let title: String
    let action: () -> Void
    var isSystemIcon: Bool = true

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Group {
                    if isSystemIcon {
                        Image(systemName: icon)
                            .font(.title3)
                            .foregroundStyle(iconColor)
                    } else {
                        Image(icon)
                            .font(.title3)
                            .foregroundStyle(iconColor)
                    }
                }
                .frame(width: 32, height: 32)

                Text(title)
                    .font(.body)
                    .foregroundStyle(.primary)

                Spacer()

                Image(systemName: "chevron.right")
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

private struct LinkRowView: View {
    let icon: String
    let iconColor: Color
    let title: String
    var subtitle: String? = nil
    let url: URL
    var isSystemIcon: Bool = true

    var body: some View {
        Link(destination: url) {
            HStack(spacing: 12) {
                Group {
                    if isSystemIcon {
                        Image(systemName: icon)
                            .font(.title3)
                            .foregroundStyle(iconColor)
                    } else {
                        Image(icon)
                            .font(.title3)
                            .foregroundStyle(iconColor)
                    }
                }
                .frame(width: 32, height: 32)

                if let subtitle = subtitle {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.body)
                            .foregroundStyle(.primary)

                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Text(title)
                        .font(.body)
                        .foregroundStyle(.primary)
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
        SettingsAboutView()
    }
}
