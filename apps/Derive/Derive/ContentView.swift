//
//  ContentView.swift
//  Derive
//

import SwiftData
import SwiftUI

struct ContentView: View {
    @QuerySingleton private var player: Player
    @State private var showSplash = true

    var body: some View {
        Group {
            if showSplash {
                SplashView()
            } else if !player.hasCompletedOnboarding {
                OnboardingView()
            } else {
                mainTabView
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                showSplash = false
            }
        }
    }

    // MARK: - UI

    private var mainTabView: some View {
        TabView {
            Tab("Derive", systemImage: "square.grid.3x3") {
                NavigationStack {
                    HomeView()
                }
            }

            Tab("Discover", systemImage: "magnifyingglass") {
                NavigationStack {
                    BrowseView()
                }
            }

            Tab("Settings", systemImage: "gearshape") {
                NavigationStack {
                    SettingsView()
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .previewDataContainer()
}

#Preview("Onboarded") {
    ContentView()
        .previewDataContainer { context in
            let player = Player.instance(with: context)
            player.onboardingCompletedAt = Date()
        }
}
