//
//  ScreenCaptureManager.swift
//  Nodox
//
//  Created by Codex on 20.04.26.
//

import AVFoundation
import AppKit
import Combine
import CoreGraphics
import CoreMedia
import CoreVideo
import Foundation
import OSLog
import ScreenCaptureKit

final class ScreenCaptureManager: NSObject, ObservableObject {
    @Published private(set) var isCapturing = false
    @Published private(set) var requiresCameraPermission = false
    @Published private(set) var statusTitle = "Screen Capture Ready"
    @Published private(set) var statusMessage =
        "Start screen capture to mirror the main display into the NoDox camera with a red test overlay."

    var actionTitle: String {
        isCapturing ? "Stop Screen Capture" : "Start Screen Capture"
    }

    private let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.buildergroup.nodox",
        category: "ScreenCapture"
    )

    private let sinkClient = VirtualCameraSinkClient()
    private let sampleHandlerQueue = DispatchQueue(
        label: "com.buildergroup.nodox.screen-capture",
        qos: .userInteractive
    )
    private let streamOutput = ScreenCaptureStreamOutput()

    private var captureStream: SCStream?
    private var droppedFrameCount = 0
    // Prevents a second finishCapture() call when transport failure fires
    // while a user-initiated stop is already in progress
    private var isStoppingAfterFailure = false

    // Created at the start of each capture session, cleared when capture stops.
    // Thread safety: written before stream starts / after stream stops (Apple guarantees
    // no callbacks are delivered after SCStream.stopCapture() returns), so reads from
    // the sample handler queue never race with writes from the Task context.
    private var frameRenderer: ScreenCaptureFrameRenderer?

    override init() {
        super.init()
        streamOutput.manager = self
    }

    // MARK: - Public API

    func toggleCapture() {
        if isCapturing { stopCapture() } else { startCapture() }
    }

    func startCapture() {
        guard !isCapturing else { return }

        guard screenRecordingAccessGranted() else {
            updateStatus(
                isCapturing: false,
                title: "Screen Recording Permission Needed",
                message:
                    "Allow NoDox in System Settings > Privacy & Security > Screen Recording, then try again."
            )
            return
        }

        updateStatus(
            isCapturing: false,
            title: "Connecting Virtual Camera",
            message:
                "Preparing the NoDox camera input and the main display capture stream."
        )

        Task { [weak self] in
            await self?.beginCapture()
        }
    }

    func stopCapture() {
        Task { [weak self] in
            await self?.finishCapture(
                title: "Screen Capture Ready",
                message:
                    "Start screen capture to mirror the main display into the NoDox camera with a red test overlay."
            )
        }
    }

    func openCameraPrivacySettings() {
        guard
            let url = URL(
                string:
                    "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera"
            )
        else {
            return
        }
        NSWorkspace.shared.open(url)
    }

    // MARK: - Frame delivery (called on sampleHandlerQueue by SCStream)

    fileprivate func handleCapturedSampleBuffer(_ sampleBuffer: CMSampleBuffer)
    {
        guard CMSampleBufferIsValid(sampleBuffer),
            CMSampleBufferDataIsReady(sampleBuffer),
            let renderer = frameRenderer
        else {
            return
        }

        guard let renderedBuffer = renderer.makeSampleBuffer(from: sampleBuffer)
        else {
            return
        }

        do {
            let result = try sinkClient.enqueue(renderedBuffer)
            if case .droppedWaitingForConsumer = result {
                droppedFrameCount += 1
                if droppedFrameCount % AppConfig.videoFrameRate == 0 {
                    logger.info(
                        "Dropping frames while waiting for the CMIO sink consumer"
                    )
                }
            } else {
                if droppedFrameCount > 0 {
                    logger.info(
                        "Resumed delivery after \(self.droppedFrameCount) dropped frame(s)"
                    )
                }
                droppedFrameCount = 0
            }
        } catch {
            logger.error(
                "Virtual camera transport failed: \(error.localizedDescription, privacy: .public)"
            )
            Task { [weak self] in
                await self?.handleTransportFailure(error)
            }
        }
    }

    fileprivate func handleStreamFailure(_ error: Error) {
        logger.error(
            "Screen capture stream failed: \(error.localizedDescription, privacy: .public)"
        )
        Task { [weak self] in
            await self?.finishCapture(
                title: "Screen Capture Failed",
                message: error.localizedDescription
            )
        }
    }

    // MARK: - Capture lifecycle

    private func beginCapture() async {
        do {
            guard await cameraAccessGranted() else {
                updateStatus(
                    isCapturing: false,
                    requiresCameraPermission: true,
                    title: "Camera Permission Needed",
                    message:
                        "Allow NoDox in System Settings > Privacy & Security > Camera so it can discover and feed its virtual camera device."
                )
                return
            }

            try await sinkClient.connectIfNeeded()

            let renderer = try ScreenCaptureFrameRenderer()

            let shareableContent = try await SCShareableContent.current
            guard
                let display = preferredDisplay(from: shareableContent.displays)
            else {
                throw CaptureError.mainDisplayUnavailable
            }

            let stream = SCStream(
                filter: SCContentFilter(
                    display: display,
                    excludingApplications: [],
                    exceptingWindows: []
                ),
                configuration: makeStreamConfiguration(),
                delegate: streamOutput
            )
            try stream.addStreamOutput(
                streamOutput,
                type: .screen,
                sampleHandlerQueue: sampleHandlerQueue
            )
            try await stream.startCapture()

            // Assign after stream is running; sample handler reads it on sampleHandlerQueue
            frameRenderer = renderer
            captureStream = stream
            droppedFrameCount = 0

            updateStatus(
                isCapturing: true,
                requiresCameraPermission: false,
                title: "Screen Capture Running",
                message:
                    "NoDox is capturing the main display and sending frames into the virtual camera sink stream."
            )
        } catch {
            sinkClient.resetConnection()
            updateStatus(
                isCapturing: false,
                requiresCameraPermission: false,
                title: "Virtual Camera Input Unavailable",
                message: error.localizedDescription
            )
        }
    }

    private func finishCapture(title: String, message: String) async {
        if let stream = captureStream {
            // stopCapture() blocks until all in-flight sample callbacks complete,
            // so clearing frameRenderer afterwards is safe.
            try? await stream.stopCapture()
        }

        captureStream = nil
        frameRenderer = nil
        sinkClient.resetConnection()
        isStoppingAfterFailure = false
        droppedFrameCount = 0

        updateStatus(
            isCapturing: false,
            requiresCameraPermission: false,
            title: title,
            message: message
        )
    }

    private func handleTransportFailure(_ error: Error) async {
        guard !isStoppingAfterFailure else { return }
        isStoppingAfterFailure = true
        await finishCapture(
            title: "Virtual Camera Input Unavailable",
            message: error.localizedDescription
        )
    }

    // MARK: - Helpers

    private func preferredDisplay(from displays: [SCDisplay]) -> SCDisplay? {
        let mainID = CGMainDisplayID()
        return displays.first(where: { $0.displayID == mainID })
            ?? displays.first
    }

    private func makeStreamConfiguration() -> SCStreamConfiguration {
        let config = SCStreamConfiguration()
        config.width = AppConfig.videoWidth
        config.height = AppConfig.videoHeight
        config.minimumFrameInterval = CMTime(
            value: 1,
            timescale: Int32(AppConfig.videoFrameRate)
        )
        config.pixelFormat = kCVPixelFormatType_32BGRA
        config.queueDepth = 3  // small enough to keep latency low, large enough to absorb render jitter
        config.showsCursor = true
        return config
    }

    private func screenRecordingAccessGranted() -> Bool {
        CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess()
    }

    private func cameraAccessGranted() async -> Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        logger.info(
            "AVFoundation video auth status: \(String(describing: status), privacy: .public)"
        )
        switch status {
        case .authorized:
            return true
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            logger.info(
                "Camera access prompt result: granted=\(granted, privacy: .public)"
            )
            return granted
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }

    private func updateStatus(
        isCapturing: Bool,
        requiresCameraPermission: Bool = false,
        title: String,
        message: String
    ) {
        DispatchQueue.main.async {
            self.isCapturing = isCapturing
            self.requiresCameraPermission = requiresCameraPermission
            self.statusTitle = title
            self.statusMessage = message
        }
    }
}

private enum CaptureError: LocalizedError {
    case mainDisplayUnavailable

    var errorDescription: String? {
        "NoDox could not find a display to capture."
    }
}

// MARK: - SCStream delegate / output (thin adapter, no logic)

private final class ScreenCaptureStreamOutput: NSObject, SCStreamDelegate,
    SCStreamOutput
{
    weak var manager: ScreenCaptureManager?

    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of outputType: SCStreamOutputType
    ) {
        guard outputType == .screen else { return }
        manager?.handleCapturedSampleBuffer(sampleBuffer)
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        manager?.handleStreamFailure(error)
    }
}
