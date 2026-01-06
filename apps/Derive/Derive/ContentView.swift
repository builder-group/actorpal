//
//  ContentView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftData
import SwiftUI

struct ContentView: View {
    var body: some View {
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
