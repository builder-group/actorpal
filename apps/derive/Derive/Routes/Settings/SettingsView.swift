//
//  SettingsView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct SettingsView: View {

    // MARK: - UI

    var body: some View {
        Form {
            appSection
        }
        .scrollContentBackground(.hidden)
        .background(Color.appBackground)
        .navigationTitle("Settings")
    }

    private var appSection: some View {
        Section("APP") {
            NavigationLink {
                SettingsAboutView()
            } label: {
                Label("About", systemImage: "info.circle")
            }

            NavigationLink {
                SettingsCreditsView()
            } label: {
                Label("Credits", systemImage: "heart")
            }
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
    }
}
