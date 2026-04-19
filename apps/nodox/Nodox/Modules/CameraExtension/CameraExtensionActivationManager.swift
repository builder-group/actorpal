//
//  CameraExtensionActivationManager.swift
//  Nodox
//
//  Created by Benno on 19.04.26.
//

import AppKit
import Foundation
import Combine
import OSLog
import SystemExtensions

@MainActor
final class CameraExtensionActivationManager: NSObject, ObservableObject {
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.buildergroup.nodox", category: "CameraExtension")
    @Published private(set) var isActivating = false
    @Published private(set) var requiresUserApproval = false
    @Published private(set) var statusTitle = "Camera Extension Ready"
    @Published private(set) var statusMessage =
        "Install the virtual camera extension, then approve it in System Settings so apps like QuickTime can see NoDox as a camera."

    func activateExtension() {
        guard !isActivating else {
            return
        }

        requiresUserApproval = false

        guard isRunningFromApplications else {
            statusTitle = "Move App To /Applications"
            statusMessage =
                "macOS only allows apps inside /Applications to activate system extensions. Move NoDox there, launch it again, and retry."
            return
        }

        let request = OSSystemExtensionRequest.activationRequest(
            forExtensionWithIdentifier: AppConfig.cameraExtensionIdentifier,
            queue: .main
        )
        request.delegate = self

        isActivating = true
        statusTitle = "Requesting Activation"
        statusMessage = "Submitting the camera extension activation request to macOS."

        OSSystemExtensionManager.shared.submitRequest(request)
    }

    func openApprovalSettings() {
        let settingsURL = approvalSettingsURL
        NSWorkspace.shared.open(settingsURL)
    }

    private var isRunningFromApplications: Bool {
        Bundle.main.bundleURL.path.hasPrefix("/Applications/")
    }

    private var approvalSettingsURL: URL {
        if #available(macOS 15.0, *) {
            return URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension")!
        }

        return URL(string: "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension")!
    }

    private func setFailureStatus(for error: Error) {
        let nsError = error as NSError
        let details = Self.errorDetails(for: nsError)

        isActivating = false
        requiresUserApproval = false
        statusTitle = "Activation Failed"
        statusMessage = details

        logger.error("Camera extension activation failed: \(details, privacy: .public)")
    }

    private static func errorDetails(for error: NSError) -> String {
        let reason = errorCodeDescription(for: error)
        let base = "\(error.domain) (\(error.code)): \(error.localizedDescription)"

        guard let reason else {
            return base
        }

        return "\(base)\n\(reason)"
    }

    private static func errorCodeDescription(for error: NSError) -> String? {
        guard error.domain == OSSystemExtensionErrorDomain else {
            return nil
        }

        switch error.code {
        case OSSystemExtensionError.unknown.rawValue:
            return "macOS reported an unknown system extension error."
        case OSSystemExtensionError.missingEntitlement.rawValue:
            return "A required entitlement is missing from the app or extension."
        case OSSystemExtensionError.unsupportedParentBundleLocation.rawValue:
            return "The app needs to be launched from /Applications to activate the extension."
        case OSSystemExtensionError.extensionNotFound.rawValue:
            return "macOS could not find the embedded camera extension in the app bundle."
        case OSSystemExtensionError.extensionMissingIdentifier.rawValue:
            return "The camera extension bundle is missing its bundle identifier."
        case OSSystemExtensionError.duplicateExtensionIdentifer.rawValue:
            return "macOS found more than one embedded extension with the same identifier."
        case OSSystemExtensionError.unknownExtensionCategory.rawValue:
            return "macOS did not recognize the embedded bundle as a valid system extension category."
        case OSSystemExtensionError.codeSignatureInvalid.rawValue:
            return "The app or extension signature is invalid for activation."
        case OSSystemExtensionError.validationFailed.rawValue:
            return "macOS rejected the extension during validation."
        case OSSystemExtensionError.forbiddenBySystemPolicy.rawValue:
            return "System policy blocked activation."
        case OSSystemExtensionError.requestCanceled.rawValue:
            return "The activation request was canceled."
        case OSSystemExtensionError.requestSuperseded.rawValue:
            return "A newer activation request replaced this one."
        case OSSystemExtensionError.authorizationRequired.rawValue:
            return "macOS requires additional authorization before activation can continue."
        default:
            return nil
        }
    }
}

extension CameraExtensionActivationManager: OSSystemExtensionRequestDelegate {
    nonisolated func requestNeedsUserApproval(_ request: OSSystemExtensionRequest) {
        Task { @MainActor in
            isActivating = false
            requiresUserApproval = true
            statusTitle = "Approval Needed"
            statusMessage =
                "NoDox needs admin approval for its camera extension. On macOS 15 and later, allow it in General > Login Items & Extensions under Camera Extensions."
        }
    }

    nonisolated func request(
        _ request: OSSystemExtensionRequest,
        didFinishWithResult result: OSSystemExtensionRequest.Result
    ) {
        Task { @MainActor in
            isActivating = false
            requiresUserApproval = false
            statusTitle = "Extension Installed"

            switch result {
            case .completed:
                statusMessage =
                    "The camera extension was activated. Open QuickTime, Photo Booth, or another camera app and look for the NoDox camera."
            case .willCompleteAfterReboot:
                statusMessage =
                    "macOS accepted the extension, but it will finish activating after a reboot."
            @unknown default:
                statusMessage =
                    "macOS returned an unexpected activation result, but the request did not fail."
            }
        }
    }

    nonisolated func request(
        _ request: OSSystemExtensionRequest,
        didFailWithError error: Error
    ) {
        Task { @MainActor in
            setFailureStatus(for: error)
        }
    }

    nonisolated func request(
        _ request: OSSystemExtensionRequest,
        actionForReplacingExtension existing: OSSystemExtensionProperties,
        withExtension ext: OSSystemExtensionProperties
    ) -> OSSystemExtensionRequest.ReplacementAction {
        .replace
    }
}
