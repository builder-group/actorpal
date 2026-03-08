//
//  DeriveApp.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftData
import SwiftUI

@main
struct DeriveApp: App {
    init() {
        configureNavigationBarAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .modelContainer(DataContainer.shared.modelContainer)
        }
    }

    private func configureNavigationBarAppearance() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithDefaultBackground()

        // Variable fonts - need to use font descriptor for weight
        let titleDescriptor = UIFontDescriptor(fontAttributes: [
            .family: "Erode Variable",
            .traits: [UIFontDescriptor.TraitKey.weight: UIFont.Weight.bold]
        ])
        let titleFont = UIFont(descriptor: titleDescriptor, size: 18)

        let largeTitleDescriptor = UIFontDescriptor(fontAttributes: [
            .family: "Erode Variable",
            .traits: [UIFontDescriptor.TraitKey.weight: UIFont.Weight.bold]
        ])
        let largeTitleFont = UIFont(descriptor: largeTitleDescriptor, size: 36)

        appearance.titleTextAttributes = [.font: titleFont]
        appearance.largeTitleTextAttributes = [.font: largeTitleFont]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
    }
}
