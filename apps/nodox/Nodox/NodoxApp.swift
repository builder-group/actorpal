//
//  NodoxApp.swift
//  Nodox
//
//  Created by Benno on 19.04.26.
//

import SwiftUI

@main
struct NodoxApp: App {
    @StateObject private var cameraExtensionActivationManager =
        CameraExtensionActivationManager()
    @StateObject private var screenCaptureManager = ScreenCaptureManager()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(cameraExtensionActivationManager)
                .environmentObject(screenCaptureManager)
        }
    }
}
