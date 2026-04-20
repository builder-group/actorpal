//
//  HomeView.swift
//  Nodox
//
//  Created by Benno on 19.04.26.
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var cameraExtensionActivationManager:
        CameraExtensionActivationManager
    @EnvironmentObject private var screenCaptureManager: ScreenCaptureManager

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            headerSection
            virtualCameraSection
            screenCaptureSection
            actionSection
            detailsSection
        }
        .frame(maxWidth: 720, alignment: .leading)
        .padding(32)
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("NoDox")
                    .font(.largeTitle.bold())

                Spacer()

                Text(AppConfig.versionLabel)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.quaternary.opacity(0.55), in: Capsule())
            }

            Text(
                "The current POC path is simple: install the camera extension, mirror the main display into the sink stream, and keep the red overlay visible so we know the end-to-end pipeline is live."
            )
            .foregroundStyle(.secondary)
        }
    }

    private var virtualCameraSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Virtual Camera")
                .font(.headline)

            VStack(alignment: .leading, spacing: 8) {
                Text(cameraExtensionActivationManager.statusTitle)
                    .font(.title3.weight(.semibold))

                Text(cameraExtensionActivationManager.statusMessage)
                    .foregroundStyle(.secondary)

                if cameraExtensionActivationManager.requiresUserApproval {
                    Button(
                        "Open System Settings",
                        action: cameraExtensionActivationManager
                            .openApprovalSettings
                    )
                    .buttonStyle(.link)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                .quaternary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 20)
            )
        }
    }

    private var screenCaptureSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Screen Capture")
                .font(.headline)

            VStack(alignment: .leading, spacing: 8) {
                Text(screenCaptureManager.statusTitle)
                    .font(.title3.weight(.semibold))

                Text(screenCaptureManager.statusMessage)
                    .foregroundStyle(.secondary)

                if screenCaptureManager.requiresCameraPermission {
                    Button(
                        "Open Camera Settings",
                        action: screenCaptureManager.openCameraPrivacySettings
                    )
                    .buttonStyle(.link)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                .quaternary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 20)
            )
        }
    }

    private var actionSection: some View {
        VStack(spacing: 12) {
            Button(action: cameraExtensionActivationManager.activateExtension) {
                Text(
                    cameraExtensionActivationManager.isActivating
                        ? "Requesting..."
                        : cameraExtensionActivationManager.actionTitle
                )
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(cameraExtensionActivationManager.isActivating)

            Button(action: screenCaptureManager.toggleCapture) {
                Text(screenCaptureManager.actionTitle)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Next Check")
                .font(.headline)

            Text("1. Run NoDox from /Applications.")
            Text(
                "2. Install or reinstall the camera extension and approve it if macOS asks."
            )
            Text("3. Start screen capture and allow Screen Recording access.")
            Text(
                "4. Open OBS, QuickTime, or Photo Booth and verify the NoDox camera mirrors the screen with the red test overlay."
            )
        }
        .foregroundStyle(.secondary)
    }
}

#Preview {
    HomeView()
        .environmentObject(CameraExtensionActivationManager())
        .environmentObject(ScreenCaptureManager())
}
