//
//  ContentView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftData
import SwiftUI

enum AppTab: Hashable {
    case derive, discover, settings
}

struct ContentView: View {
    @QuerySingleton private var player: Player
    @State private var showSplash = true
    @State private var selectedTab: AppTab = .derive

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
        TabView(selection: $selectedTab) {
            Tab(value: .derive) {
                NavigationStack {
                    HomeView(selectedTab: $selectedTab)
                }
            } label: {
                Label("Dérive", image: "logo")
            }

            Tab(value: .discover) {
                NavigationStack {
                    BrowseView(selectedTab: $selectedTab)
                }
            } label: {
                Label("Discover", systemImage: "sparkle.magnifyingglass")
            }

            Tab(value: .settings) {
                NavigationStack {
                    SettingsView()
                }
            } label: {
                Label("Settings", systemImage: "gearshape")
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
