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
    var body: some Scene {
        WindowGroup {
            ContentView()
                .modelContainer(DataContainer.shared.modelContainer)
        }
    }
}
