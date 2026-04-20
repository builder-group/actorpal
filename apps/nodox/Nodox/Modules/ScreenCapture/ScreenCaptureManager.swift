import AVFoundation
import AppKit
import Combine
import CoreGraphics
import CoreMedia
import CoreVideo
import Foundation
import OSLog
import ScreenCaptureKit
import Vision

final class ScreenCaptureManager: NSObject, ObservableObject {
    @Published private(set) var isCapturing = false
    @Published private(set) var isDebugMode = false
    @Published private(set) var isRedactionEnabled = false
    @Published private(set) var requiresCameraPermission = false
    @Published private(set) var visionUseFastRecognition = false
    @Published private(set) var visionMinimumTextHeight: Float = 0.008
    @Published private(set) var redactionPatterns =
        AppConfig.defaultRedactionPatterns
    @Published private(set) var redactionActivePatternCount =
        AppConfig.defaultRedactionPatterns.count
    @Published private(set) var redactionPatternErrors:
        [SensitiveTextMatcher.PatternError] = []
    @Published private(set) var captureTargets: [CaptureTarget] = []
    @Published private(set) var selectedTarget: CaptureTarget?
    @Published private(set) var cropMode: CropMode = .none
    @Published private(set) var cropAlignment: CropAlignment = .center
    @Published private(set) var statusTitle = "Screen Capture Ready"
    @Published private(set) var statusMessage =
        "Choose a capture source, then start screen capture."

    // Owned here; SampleBufferPreviewView hosts it in a layer hierarchy.
    // AVSampleBufferDisplayLayer.enqueue is thread-safe — called from sampleHandlerQueue.
    let previewLayer = AVSampleBufferDisplayLayer()

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
    private let redactionMatcher = SensitiveTextMatcher()

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
        setupPreviewLayer()
        syncRedactionPatterns()
    }

    // MARK: - Public API

    func toggleCapture() {
        if isCapturing { stopCapture() } else { startCapture() }
    }

    func toggleDebugMode() {
        isDebugMode.toggle()
        frameRenderer?.debugMode = isDebugMode
    }

    func setRedactionEnabled(_ value: Bool) {
        isRedactionEnabled = value
        frameRenderer?.redactionEnabled = value
    }

    func setRedactionPattern(_ value: String, at index: Int) {
        guard redactionPatterns.indices.contains(index) else { return }
        redactionPatterns[index] = value
        syncRedactionPatterns()
    }

    func addRedactionPattern() {
        redactionPatterns.append("")
        syncRedactionPatterns()
    }

    func removeRedactionPattern(at index: Int) {
        guard redactionPatterns.indices.contains(index) else { return }
        redactionPatterns.remove(at: index)
        syncRedactionPatterns()
    }

    func toggleVisionRecognitionSpeed() {
        visionUseFastRecognition.toggle()
        frameRenderer?.detector?.recognitionLevel =
            visionUseFastRecognition ? .fast : .accurate
    }

    func setVisionMinimumTextHeight(_ value: Float) {
        visionMinimumTextHeight = value
        frameRenderer?.detector?.minimumTextHeight = value
    }

    func selectTarget(_ target: CaptureTarget) {
        selectedTarget = target
    }

    func setCropMode(_ mode: CropMode) {
        cropMode = mode
    }

    func setCropAlignment(_ alignment: CropAlignment) {
        cropAlignment = alignment
    }

    func loadCaptureTargets() {
        Task { [weak self] in
            guard let self else { return }
            do {
                let content = try await SCShareableContent.current
                let displays = content.displays.map {
                    CaptureTarget.display($0)
                }
                // Only include on-screen windows large enough to be meaningful app windows
                let windows = content.windows
                    .filter {
                        $0.isOnScreen && $0.frame.width >= 100
                            && $0.frame.height >= 100
                    }
                    .map { CaptureTarget.window($0) }
                await MainActor.run {
                    self.captureTargets = displays + windows
                    if self.selectedTarget == nil {
                        self.selectedTarget = displays.first
                    }
                }
            } catch {
                self.logger.error(
                    "Failed to load capture targets: \(error.localizedDescription, privacy: .public)"
                )
            }
        }
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
            message: "Preparing the NoDox camera input and capture stream."
        )

        Task { [weak self] in
            await self?.beginCapture()
        }
    }

    func stopCapture() {
        Task { [weak self] in
            await self?.finishCapture(
                title: "Screen Capture Ready",
                message: "Choose a capture source, then start screen capture."
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

        previewLayer.enqueue(renderedBuffer)

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
            let detector = VisionTextDetector()
            detector.recognitionLevel =
                visionUseFastRecognition ? .fast : .accurate
            detector.minimumTextHeight = visionMinimumTextHeight
            renderer.detector = detector
            renderer.debugMode = isDebugMode
            renderer.redactionEnabled = isRedactionEnabled
            renderer.matcher = redactionMatcher

            let filter: SCContentFilter
            let baseStreamSize: CGSize

            switch selectedTarget {
            case .window(let window):
                filter = SCContentFilter(desktopIndependentWindow: window)
                // Keep the stream bounded to the window's logical size; the renderer
                // later fits that capture into the fixed 1920×1080 virtual camera output.
                baseStreamSize = CGSize(
                    width: CGFloat(max(1, Int(window.frame.width))),
                    height: CGFloat(max(1, Int(window.frame.height)))
                )
            case .display(let display):
                filter = SCContentFilter(
                    display: display,
                    excludingApplications: [],
                    exceptingWindows: []
                )
                baseStreamSize = CGSize(
                    width: CGFloat(AppConfig.videoWidth),
                    height: CGFloat(AppConfig.videoHeight)
                )
            case nil:
                // No target selected — fall back to the main display
                let content = try await SCShareableContent.current
                guard let display = preferredDisplay(from: content.displays)
                else {
                    throw CaptureError.mainDisplayUnavailable
                }
                filter = SCContentFilter(
                    display: display,
                    excludingApplications: [],
                    exceptingWindows: []
                )
                baseStreamSize = CGSize(
                    width: CGFloat(AppConfig.videoWidth),
                    height: CGFloat(AppConfig.videoHeight)
                )
            }

            let geometry = ActiveCaptureGeometry(
                baseStreamSize: baseStreamSize,
                contentRect: filter.contentRect
            )

            let stream = SCStream(
                filter: filter,
                configuration: makeStreamConfiguration(
                    geometry: geometry,
                    cropMode: cropMode,
                    cropAlignment: cropAlignment
                ),
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

            let targetName = selectedTarget?.displayName ?? "main display"
            updateStatus(
                isCapturing: true,
                requiresCameraPermission: false,
                title: "Capturing \(targetName)",
                message:
                    "NoDox is sending frames into the virtual camera sink stream."
            )
        } catch {
            sinkClient.resetConnection()
            updateStatus(
                isCapturing: false,
                requiresCameraPermission: false,
                title: "Capture Failed",
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
        previewLayer.flush()

        DispatchQueue.main.async {
            self.isDebugMode = false
            self.visionUseFastRecognition = false
            self.visionMinimumTextHeight = 0.008
        }

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

    private func setupPreviewLayer() {
        previewLayer.videoGravity = .resizeAspect
        previewLayer.backgroundColor = CGColor(gray: 0, alpha: 1)

        // A running timebase anchored to the host clock lets the layer display
        // frames immediately when their presentation timestamp matches.
        var timebase: CMTimebase?
        let status = CMTimebaseCreateWithSourceClock(
            allocator: kCFAllocatorDefault,
            sourceClock: CMClockGetHostTimeClock(),
            timebaseOut: &timebase
        )
        guard status == noErr, let timebase else {
            logger.fault(
                "Failed to create preview timebase (OSStatus \(status))"
            )
            return
        }
        CMTimebaseSetRate(timebase, rate: 1.0)
        CMTimebaseSetTime(
            timebase,
            time: CMClockGetTime(CMClockGetHostTimeClock())
        )
        previewLayer.controlTimebase = timebase
    }

    private func preferredDisplay(from displays: [SCDisplay]) -> SCDisplay? {
        let mainID = CGMainDisplayID()
        return displays.first(where: { $0.displayID == mainID })
            ?? displays.first
    }

    private func makeStreamConfiguration(
        geometry: ActiveCaptureGeometry,
        cropMode: CropMode,
        cropAlignment: CropAlignment
    ) -> SCStreamConfiguration {
        let config = SCStreamConfiguration()
        let sourceRect = sourceRect(
            in: geometry.contentRect,
            cropMode: cropMode,
            cropAlignment: cropAlignment
        )
        let streamSize = streamSize(
            boundingSize: geometry.baseStreamSize,
            cropMode: cropMode,
            sourceRect: sourceRect
        )
        config.width = Int(streamSize.width)
        config.height = Int(streamSize.height)
        config.minimumFrameInterval = CMTime(
            value: 1,
            timescale: Int32(AppConfig.videoFrameRate)
        )
        config.pixelFormat = kCVPixelFormatType_32BGRA
        config.preservesAspectRatio = true
        config.scalesToFit = true
        config.queueDepth = 3  // small enough to keep latency low, large enough to absorb render jitter
        config.showsCursor = true
        config.sourceRect = sourceRect
        return config
    }

    private func sourceRect(
        in contentRect: CGRect,
        cropMode: CropMode,
        cropAlignment: CropAlignment
    ) -> CGRect {
        guard case .aspect(let width, let height) = cropMode,
            width > 0,
            height > 0
        else {
            return contentRect
        }

        let targetAspect = CGFloat(width) / CGFloat(height)
        let sourceAspect = contentRect.width / contentRect.height
        let cropWidth: CGFloat
        let cropHeight: CGFloat

        if sourceAspect > targetAspect {
            cropHeight = contentRect.height
            cropWidth = cropHeight * targetAspect
        } else {
            cropWidth = contentRect.width
            cropHeight = cropWidth / targetAspect
        }

        let xInset = contentRect.width - cropWidth
        let x: CGFloat
        switch cropAlignment {
        case .left:
            x = contentRect.minX
        case .center:
            x = contentRect.minX + xInset / 2
        case .right:
            x = contentRect.maxX - cropWidth
        }

        return CGRect(
            x: x,
            y: contentRect.minY + (contentRect.height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight
        )
    }

    private func streamSize(
        boundingSize: CGSize,
        cropMode: CropMode,
        sourceRect: CGRect
    ) -> CGSize {
        guard cropMode != .none else { return boundingSize }

        let sourceAspect = sourceRect.width / sourceRect.height
        let boundingAspect = boundingSize.width / boundingSize.height

        if sourceAspect > boundingAspect {
            return CGSize(
                width: max(1, floor(boundingSize.width)),
                height: max(1, floor(boundingSize.width / sourceAspect))
            )
        }

        return CGSize(
            width: max(1, floor(boundingSize.height * sourceAspect)),
            height: max(1, floor(boundingSize.height))
        )
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

    private func updateRedactionPatternState(
        _ result: SensitiveTextMatcher.UpdateResult
    ) {
        DispatchQueue.main.async {
            self.redactionActivePatternCount = result.activePatternCount
            self.redactionPatternErrors = result.errors
        }
    }

    private func syncRedactionPatterns() {
        updateRedactionPatternState(
            redactionMatcher.updatePatterns(redactionPatterns)
        )
    }
}

private enum CaptureError: LocalizedError {
    case mainDisplayUnavailable

    var errorDescription: String? {
        "NoDox could not find a display to capture."
    }
}

private struct ActiveCaptureGeometry {
    let baseStreamSize: CGSize
    let contentRect: CGRect
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
