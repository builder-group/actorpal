//
//  SettingsView.swift
//  Derive
//

import SwiftUI

struct SettingsView: View {
    var body: some View {
        Form {
            aboutSection
            comingSoonSection
        }
        .navigationTitle("Settings")
    }

    // MARK: - UI

    private var aboutSection: some View {
        Section("ABOUT") {
            HStack {
                Text("Version")
                Spacer()
                Text("1.0.0")
                    .foregroundStyle(.secondary)
            }

            Link(destination: URL(string: "https://github.com")!) {
                HStack {
                    Text("Source Code")
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var comingSoonSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                Label("More challenges coming soon", systemImage: "sparkles")
                    .font(.headline)

                Text("We're working on new challenge types like shapes, textures, and themes. Stay tuned!")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 8)
        } header: {
            Text("COMING SOON")
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
}
