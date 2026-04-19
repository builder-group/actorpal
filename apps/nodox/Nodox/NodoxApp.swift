//
//  NodoxApp.swift
//  Nodox
//
//  Created by Benno on 19.04.26.
//

import SwiftUI

@main
struct NodoxApp: App {
    @StateObject private var cameraExtensionActivationManager = CameraExtensionActivationManager()
    private let shouldAutoActivateExtension = ProcessInfo.processInfo.arguments.contains("--auto-activate-extension")

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(cameraExtensionActivationManager)
                .task {
                    guard shouldAutoActivateExtension else {
                        return
                    }

                    cameraExtensionActivationManager.activateExtension()
                }
        }
    }
}
