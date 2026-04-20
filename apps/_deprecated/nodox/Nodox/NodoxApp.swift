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
