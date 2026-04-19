//
//  HomeView.swift
//  Nodox
//
//  Created by Benno on 19.04.26.
//

import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var cameraExtensionActivationManager: CameraExtensionActivationManager

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            headerSection
            statusSection
            actionSection
            detailsSection
        }
        .frame(maxWidth: 720, alignment: .leading)
        .padding(32)
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("NoDox")
                .font(.largeTitle.bold())

            Text("Activate the virtual camera foundation first. Once macOS exposes the camera device, we can replace the sample frames with the real NoDox pipeline.")
                .foregroundStyle(.secondary)
        }
    }

    private var statusSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(cameraExtensionActivationManager.statusTitle)
                .font(.title3.weight(.semibold))

            Text(cameraExtensionActivationManager.statusMessage)
                .foregroundStyle(.secondary)

            if cameraExtensionActivationManager.requiresUserApproval {
                Button("Open System Settings", action: cameraExtensionActivationManager.openApprovalSettings)
                    .buttonStyle(.link)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 20))
    }

    private var actionSection: some View {
        Button(action: cameraExtensionActivationManager.activateExtension) {
            Text(cameraExtensionActivationManager.isActivating ? "Requesting..." : "Install Camera Extension")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(cameraExtensionActivationManager.isActivating)
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Next Check")
                .font(.headline)

            Text("1. Run NoDox from /Applications.")
            Text("2. Install and approve the camera extension.")
            Text("3. Open QuickTime or Photo Booth and verify the NoDox camera appears.")
            Text("4. Only after that, replace the sample camera frames with the real privacy pipeline.")
        }
        .foregroundStyle(.secondary)
    }
}

#Preview {
    HomeView()
        .environmentObject(CameraExtensionActivationManager())
}
