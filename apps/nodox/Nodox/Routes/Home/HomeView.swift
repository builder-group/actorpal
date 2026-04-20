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
            if screenCaptureManager.isCapturing
                && screenCaptureManager.isDebugMode
            {
                visionSettingsSection
            }
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
                "Install the camera extension, start screen capture, then enable Vision debug mode to see Apple Vision text detection boxes overlaid on the live feed."
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

            if screenCaptureManager.isCapturing {
                Button(action: screenCaptureManager.toggleDebugMode) {
                    Text(
                        screenCaptureManager.isDebugMode
                            ? "Hide Vision Debug Boxes"
                            : "Show Vision Debug Boxes"
                    )
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
                .tint(screenCaptureManager.isDebugMode ? .green : nil)
            }
        }
    }

    private var visionSettingsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Vision Settings")
                .font(.headline)

            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Recognition Quality")
                        .font(.subheadline.weight(.medium))
                    Picker(
                        "",
                        selection: Binding(
                            get: {
                                screenCaptureManager.visionUseFastRecognition
                            },
                            set: { _ in
                                screenCaptureManager
                                    .toggleVisionRecognitionSpeed()
                            }
                        )
                    ) {
                        Text("Accurate").tag(false)
                        Text("Fast").tag(true)
                    }
                    .pickerStyle(.segmented)
                    Text(
                        screenCaptureManager.visionUseFastRecognition
                            ? "Faster, misses more text — good for latency testing."
                            : "Slower, catches significantly more text — default."
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Minimum Text Height")
                            .font(.subheadline.weight(.medium))
                        Spacer()
                        Text(
                            String(
                                format: "%.3f",
                                screenCaptureManager.visionMinimumTextHeight
                            )
                        )
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                    }
                    Slider(
                        value: Binding(
                            get: {
                                screenCaptureManager.visionMinimumTextHeight
                            },
                            set: {
                                screenCaptureManager.setVisionMinimumTextHeight(
                                    $0
                                )
                            }
                        ),
                        in: 0.004...0.05,
                        step: 0.002
                    )
                    Text(
                        "Lower catches smaller text but slows detection. Default 0.03125 misses most UI text; 0.008 is a good starting point."
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
            }
            .padding(20)
            .background(
                .quaternary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 20)
            )
        }
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Validation Steps")
                .font(.headline)

            Text("1. Run NoDox from /Applications.")
            Text(
                "2. Install or reinstall the camera extension and approve it if macOS asks."
            )
            Text("3. Start screen capture and allow Screen Recording access.")
            Text(
                "4. Open OBS, QuickTime, or Photo Booth and confirm the NoDox camera shows the live display."
            )
            Text(
                "5. Enable Vision debug boxes and look for green outlines appearing over text regions in the feed."
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
