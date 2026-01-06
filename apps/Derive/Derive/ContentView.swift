//
//  ContentView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftData
import SwiftUI

struct ContentView: View {
    @QuerySingleton private var player: Player
    @State private var showSplash = true

    var body: some View {
        ZStack {
            if showSplash {
                SplashView()
                    .transition(.opacity)
            } else if !player.hasCompletedOnboarding {
                OnboardingView()
                    .transition(.opacity)
            } else {
                mainTabView
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: showSplash)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation {
                    showSplash = false
                }
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

            Tab("History", systemImage: "clock.arrow.circlepath") {
                NavigationStack {
                    HistoryView()
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
