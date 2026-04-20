import AppKit
import CoreImage
import CoreMedia
import CoreVideo
import Foundation
import OSLog

/// How the source capture should be cropped before it reaches Vision and rendering.
enum CropMode: Hashable {
    case none
    /// Crops the largest region that matches the given aspect ratio.
    case aspect(width: Int, height: Int)
}

enum CropAlignment: String, CaseIterable, Hashable {
    case left
    case center
    case right

    var title: String {
        rawValue.capitalized
    }
}

enum RedactionMode: CaseIterable, Hashable {
    case live
    case delayed

    var title: String {
        switch self {
        case .live:
            return "Live"
        case .delayed:
            return "Delayed"
        }
    }
}

/// Converts a raw ScreenCaptureKit frame into a 1920x1080 BGRA sample buffer.
///
/// When `debugMode` is true, detected text bounding boxes from `detector` are
/// drawn as green outlines over the rendered frame. When `redactionEnabled` is
/// true, OCR strings that match the configured regex patterns are covered with
/// solid black bars before the frame reaches the preview or virtual camera.
///
/// One instance should live for the duration of a single capture session.
/// It is safe to call `makeSampleBuffers(from:)` from any thread.
final class ScreenCaptureFrameRenderer {

    enum RendererError: LocalizedError {
        case formatDescriptionFailed(OSStatus)
        case pixelBufferPoolFailed(CVReturn)

        var errorDescription: String? {
            switch self {
            case .formatDescriptionFailed(let status):
                return
                    "Could not create the render format description (OSStatus \(status))."
            case .pixelBufferPoolFailed(let status):
                return
                    "Could not create the render pixel buffer pool (CVReturn \(status))."
            }
        }
    }

    private struct OverlaySnapshot {
        let debugBoxes: [CGRect]
        let redactionBoxes: [CGRect]
    }

    private struct AnalyzedChunk {
        let overlay: OverlaySnapshot
        let pixelBuffers: [CVPixelBuffer]
    }

    private struct DelayedAnalysisReservation {
        let generation: UInt64
        let token: UInt64
    }

    private let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.buildergroup.nodox",
        category: "FrameRenderer"
    )
    // Set by ScreenCaptureManager on the sample-handler queue before or during capture.
    private var debugMode = false
    private var redactionEnabled = false
    private var redactionMode: RedactionMode = .live
    private var delayedChunkSize = AppConfig.defaultRedactionChunkSize

    // Injected before stream starts; cleared after stream stops.
    var detector: VisionTextDetector?
    var matcher: SensitiveTextMatcher?

    private let outputRect = CGRect(
        x: 0,
        y: 0,
        width: AppConfig.videoWidth,
        height: AppConfig.videoHeight
    )
    private let ciContext = CIContext()
    private let colorSpace = CGColorSpaceCreateDeviceRGB()
    private let outputFormatDescription: CMFormatDescription
    private let pixelBufferPool: CVPixelBufferPool

    // Delayed-redaction state.
    // inputChunk, outputQueue, and latestDelayedOverlay are accessed only on
    // sampleHandlerQueue. pendingChunks, delayedGeneration, and activeAnalysisToken
    // are shared with detectionQueue and therefore guarded by chunkLock.
    private var inputChunk: [CVPixelBuffer] = []
    private var outputQueue: [CVPixelBuffer] = []
    private var latestDelayedOverlay = OverlaySnapshot(
        debugBoxes: [],
        redactionBoxes: []
    )
    private let chunkLock = NSLock()
    private var pendingChunks: [AnalyzedChunk] = []
    private var delayedGeneration: UInt64 = 0
    private var nextAnalysisToken: UInt64 = 0
    private var activeAnalysisToken: UInt64?

    init() throws {
        outputFormatDescription = try Self.makeFormatDescription(
            width: AppConfig.videoWidth,
            height: AppConfig.videoHeight
        )
        pixelBufferPool = try Self.makePixelBufferPool(
            width: AppConfig.videoWidth,
            height: AppConfig.videoHeight
        )
    }

    // MARK: - Configuration

    func setDebugMode(_ value: Bool) {
        debugMode = value
    }

    func setRedactionEnabled(_ value: Bool) {
        redactionEnabled = value
        if !value {
            resetDelayedState()
        }
    }

    func setRedactionMode(_ value: RedactionMode) {
        guard redactionMode != value else { return }
        redactionMode = value
        resetDelayedState()
    }

    func setDelayedChunkSize(_ value: Int) {
        let clamped = max(
            AppConfig.minRedactionChunkSize,
            min(value, AppConfig.maxRedactionChunkSize)
        )
        guard delayedChunkSize != clamped else { return }
        delayedChunkSize = clamped
        resetDelayedState()
    }

    // MARK: - Frame rendering

    /// Returns zero or more rendered sample buffers that are ready for delivery.
    ///
    /// Live mode returns the current frame immediately. Delayed mode buffers a
    /// chunk of frames, samples the last frame in that chunk with Vision, then
    /// applies that sampled overlay to the whole chunk before release. If Vision
    /// is already busy, delayed mode reuses the most recent sampled overlay for
    /// the next chunk instead of letting latency grow without bound.
    func makeSampleBuffers(from sourceBuffer: CMSampleBuffer)
        -> [CMSampleBuffer]
    {
        guard
            let sourcePixelBuffer = CMSampleBufferGetImageBuffer(sourceBuffer),
            let renderedPixelBuffer = makeRenderedPixelBuffer(
                from: sourcePixelBuffer
            )
        else {
            return []
        }

        let usesDelayedRedaction = redactionEnabled && redactionMode == .delayed
        guard usesDelayedRedaction else {
            guard
                let sampleBuffer = makeLiveSampleBuffer(
                    from: renderedPixelBuffer,
                    sourceBuffer: sourceBuffer,
                    sourcePixelBuffer: sourcePixelBuffer
                )
            else {
                return []
            }
            return [sampleBuffer]
        }

        // Delayed mode: chunk-sampled best effort.
        //
        // Frames are held in inputChunk until the chunk is full, then Vision runs on the
        // last source frame and the resulting overlay (redaction + debug boxes) is applied
        // to every frame in the chunk before they are pushed to outputQueue. This reduces
        // leak risk compared with live mode, but it is still best effort because text that
        // appears and disappears between sampled frames can be missed.
        //
        // To keep latency bounded, at most one chunk is analyzed at a time. If Vision is
        // still busy when the next chunk fills, that chunk reuses the most recent sampled
        // overlay instead of waiting indefinitely and growing an unbounded backlog.
        drainPendingChunks()

        inputChunk.append(renderedPixelBuffer)

        if inputChunk.count >= delayedChunkSize {
            let chunk = inputChunk
            inputChunk.removeAll(keepingCapacity: true)
            scheduleDelayedChunk(
                chunk,
                sampledSourcePixelBuffer: sourcePixelBuffer
            )
        }

        guard !outputQueue.isEmpty else { return [] }
        let outputPixelBuffer = outputQueue.removeFirst()
        // Use the current source buffer's timestamp so the display layer and CMIO sink
        // always receive frames stamped "now". Delayed frames with their original capture
        // timestamps would appear in the past to the layer, causing it to display them
        // immediately without any rate-limiting → burst playback.
        let timestamp = resolvedPresentationTimeStamp(for: sourceBuffer)
        guard
            let sampleBuffer = makeOutputSampleBuffer(
                from: outputPixelBuffer,
                presentationTimeStamp: timestamp
            )
        else {
            return []
        }
        return [sampleBuffer]
    }

    private func makeLiveSampleBuffer(
        from renderedPixelBuffer: CVPixelBuffer,
        sourceBuffer: CMSampleBuffer,
        sourcePixelBuffer: CVPixelBuffer
    ) -> CMSampleBuffer? {
        let overlay = liveOverlaySnapshot(for: sourcePixelBuffer)
        applyOverlays(overlay, to: renderedPixelBuffer)
        return makeOutputSampleBuffer(
            from: renderedPixelBuffer,
            presentationTimeStamp: resolvedPresentationTimeStamp(
                for: sourceBuffer
            )
        )
    }

    private func makeRenderedPixelBuffer(from sourcePixelBuffer: CVPixelBuffer)
        -> CVPixelBuffer?
    {
        guard let pixelBuffer = makePixelBuffer() else { return nil }

        let sourceImage = CIImage(cvPixelBuffer: sourcePixelBuffer)
        let framed =
            sourceImage
            .scaledToFit(in: outputRect)
            .composited(over: CIImage(color: .black).cropped(to: outputRect))

        ciContext.render(
            framed,
            to: pixelBuffer,
            bounds: outputRect,
            colorSpace: colorSpace
        )

        return pixelBuffer
    }

    private func makePixelBuffer() -> CVPixelBuffer? {
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferPoolCreatePixelBuffer(
            kCFAllocatorDefault,
            pixelBufferPool,
            &pixelBuffer
        )
        guard status == kCVReturnSuccess else {
            logger.error(
                "Pixel buffer pool exhausted (CVReturn \(status)) - dropping frame"
            )
            return nil
        }
        return pixelBuffer
    }

    private func liveOverlaySnapshot(for sourcePixelBuffer: CVPixelBuffer)
        -> OverlaySnapshot
    {
        guard debugMode || redactionEnabled else {
            return OverlaySnapshot(debugBoxes: [], redactionBoxes: [])
        }

        let detections = detector?.detect(in: sourcePixelBuffer) ?? []
        return overlaySnapshot(
            from: detections,
            sourceWidth: CGFloat(CVPixelBufferGetWidth(sourcePixelBuffer)),
            sourceHeight: CGFloat(CVPixelBufferGetHeight(sourcePixelBuffer)),
            debugEnabled: debugMode,
            redactionEnabled: redactionEnabled
        )
    }

    private func overlaySnapshot(
        from detections: [VisionTextDetector.DetectedText],
        sourceWidth: CGFloat,
        sourceHeight: CGFloat,
        debugEnabled: Bool,
        redactionEnabled: Bool
    ) -> OverlaySnapshot {
        let debugBoxes: [CGRect] =
            debugEnabled
            ? detections.map { detected in
                mapToOutput(
                    detected.boundingBox,
                    sourceWidth: sourceWidth,
                    sourceHeight: sourceHeight
                )
            }
            : []

        let redactionBoxes: [CGRect] =
            redactionEnabled
            ? (matcher?.matchedDetections(in: detections) ?? []).map {
                detected in
                paddedRedactionBox(
                    for: mapToOutput(
                        detected.boundingBox,
                        sourceWidth: sourceWidth,
                        sourceHeight: sourceHeight
                    )
                )
            }
            : []

        return OverlaySnapshot(
            debugBoxes: debugBoxes,
            redactionBoxes: redactionBoxes
        )
    }

    private func drainPendingChunks() {
        chunkLock.lock()
        let chunks = pendingChunks
        pendingChunks.removeAll(keepingCapacity: true)
        chunkLock.unlock()

        for chunk in chunks {
            latestDelayedOverlay = chunk.overlay
            outputQueue.append(contentsOf: chunk.pixelBuffers)
        }
    }

    private func scheduleDelayedChunk(
        _ chunk: [CVPixelBuffer],
        sampledSourcePixelBuffer: CVPixelBuffer
    ) {
        guard let reservation = reserveDelayedAnalysisSlot() else {
            enqueueChunk(chunk, using: latestDelayedOverlay)
            return
        }

        analyzeAndEnqueueChunk(
            chunk,
            sampledSourcePixelBuffer: sampledSourcePixelBuffer,
            reservation: reservation
        )
    }

    private func reserveDelayedAnalysisSlot() -> DelayedAnalysisReservation? {
        guard detector != nil else { return nil }

        chunkLock.lock()
        defer { chunkLock.unlock() }

        guard activeAnalysisToken == nil else { return nil }
        nextAnalysisToken &+= 1
        let token = nextAnalysisToken
        activeAnalysisToken = token
        return DelayedAnalysisReservation(
            generation: delayedGeneration,
            token: token
        )
    }

    // Runs Vision on the last source frame of a completed chunk (on detectionQueue),
    // applies the resulting overlay to every rendered frame in the chunk, then moves
    // them to pendingChunks so drainPendingChunks can pick them up on the next tick.
    private func analyzeAndEnqueueChunk(
        _ chunk: [CVPixelBuffer],
        sampledSourcePixelBuffer: CVPixelBuffer,
        reservation: DelayedAnalysisReservation
    ) {
        let sourceWidth = CGFloat(
            CVPixelBufferGetWidth(sampledSourcePixelBuffer)
        )
        let sourceHeight = CGFloat(
            CVPixelBufferGetHeight(sampledSourcePixelBuffer)
        )
        let capturedDebugMode = debugMode
        let capturedRedactionEnabled = redactionEnabled

        guard let detector else {
            releaseDelayedAnalysisSlot(token: reservation.token)
            enqueueChunk(chunk, using: latestDelayedOverlay)
            return
        }

        detector.analyzeSample(in: sampledSourcePixelBuffer) {
            [weak self] detections in
            guard let self else { return }
            let overlay = self.overlaySnapshot(
                from: detections,
                sourceWidth: sourceWidth,
                sourceHeight: sourceHeight,
                debugEnabled: capturedDebugMode,
                redactionEnabled: capturedRedactionEnabled
            )
            for pixelBuffer in chunk {
                self.applyOverlays(overlay, to: pixelBuffer)
            }

            self.chunkLock.lock()
            if self.delayedGeneration == reservation.generation {
                self.pendingChunks.append(
                    AnalyzedChunk(overlay: overlay, pixelBuffers: chunk)
                )
            }
            if self.activeAnalysisToken == reservation.token {
                self.activeAnalysisToken = nil
            }
            self.chunkLock.unlock()
        }
    }

    private func releaseDelayedAnalysisSlot(token: UInt64) {
        chunkLock.lock()
        if activeAnalysisToken == token {
            activeAnalysisToken = nil
        }
        chunkLock.unlock()
    }

    private func enqueueChunk(
        _ chunk: [CVPixelBuffer],
        using overlay: OverlaySnapshot
    ) {
        for pixelBuffer in chunk {
            applyOverlays(overlay, to: pixelBuffer)
        }
        outputQueue.append(contentsOf: chunk)
    }

    private func resetDelayedState() {
        inputChunk.removeAll(keepingCapacity: true)
        outputQueue.removeAll(keepingCapacity: true)
        chunkLock.lock()
        pendingChunks.removeAll(keepingCapacity: true)
        delayedGeneration &+= 1
        activeAnalysisToken = nil
        chunkLock.unlock()
        latestDelayedOverlay = OverlaySnapshot(
            debugBoxes: [],
            redactionBoxes: []
        )
    }

    private func resolvedPresentationTimeStamp(for sourceBuffer: CMSampleBuffer)
        -> CMTime
    {
        let sourceTime = sourceBuffer.presentationTimeStamp
        guard sourceTime.isValid else {
            return CMClockGetTime(CMClockGetHostTimeClock())
        }
        return sourceTime
    }

    private func makeOutputSampleBuffer(
        from pixelBuffer: CVPixelBuffer,
        presentationTimeStamp: CMTime
    ) -> CMSampleBuffer? {
        var timing = CMSampleTimingInfo(
            duration: CMTime(
                value: 1,
                timescale: CMTimeScale(AppConfig.videoFrameRate)
            ),
            presentationTimeStamp: presentationTimeStamp,
            decodeTimeStamp: .invalid
        )

        var sampleBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            formatDescription: outputFormatDescription,
            sampleTiming: &timing,
            sampleBufferOut: &sampleBuffer
        )
        guard status == noErr else {
            logger.error(
                "CMSampleBufferCreateReadyWithImageBuffer failed: \(status)"
            )
            return nil
        }

        return sampleBuffer
    }

    // Maps a box from source pixel coordinates to output pixel coordinates,
    // matching the scale+offset applied by scaledToFit(in:).
    private func mapToOutput(
        _ box: CGRect,
        sourceWidth: CGFloat,
        sourceHeight: CGFloat
    ) -> CGRect {
        let scale = min(
            outputRect.width / sourceWidth,
            outputRect.height / sourceHeight
        )
        let xOffset = (outputRect.width - sourceWidth * scale) / 2
        let yOffset = (outputRect.height - sourceHeight * scale) / 2
        return CGRect(
            x: box.origin.x * scale + xOffset,
            y: box.origin.y * scale + yOffset,
            width: box.width * scale,
            height: box.height * scale
        )
    }

    private func paddedRedactionBox(for box: CGRect) -> CGRect {
        let horizontalPadding = max(6, box.height * 0.18)
        let verticalPadding = max(3, box.height * 0.12)
        return
            box
            .insetBy(dx: -horizontalPadding, dy: -verticalPadding)
            .intersection(outputRect)
    }

    private func applyOverlays(
        _ overlay: OverlaySnapshot,
        to pixelBuffer: CVPixelBuffer
    ) {
        drawOverlays(
            redactionBoxes: overlay.redactionBoxes,
            debugBoxes: overlay.debugBoxes,
            on: pixelBuffer
        )
    }

    private func drawOverlays(
        redactionBoxes: [CGRect],
        debugBoxes: [CGRect],
        on pixelBuffer: CVPixelBuffer
    ) {
        guard !redactionBoxes.isEmpty || !debugBoxes.isEmpty else { return }

        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

        guard
            let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer),
            let context = CGContext(
                data: baseAddress,
                width: CVPixelBufferGetWidth(pixelBuffer),
                height: CVPixelBufferGetHeight(pixelBuffer),
                bitsPerComponent: 8,
                bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
                space: colorSpace,
                bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue
                    | CGImageAlphaInfo.premultipliedFirst.rawValue
            )
        else { return }

        if !redactionBoxes.isEmpty {
            context.setFillColor(NSColor.black.cgColor)
            for box in redactionBoxes {
                context.fill(box)
            }
        }

        guard !debugBoxes.isEmpty else { return }

        context.setStrokeColor(NSColor.systemGreen.cgColor)
        context.setLineWidth(2)

        for box in debugBoxes {
            context.stroke(box)
        }
    }

    private static func makeFormatDescription(width: Int, height: Int) throws
        -> CMFormatDescription
    {
        var desc: CMFormatDescription?
        let status = CMVideoFormatDescriptionCreate(
            allocator: kCFAllocatorDefault,
            codecType: kCVPixelFormatType_32BGRA,
            width: Int32(width),
            height: Int32(height),
            extensions: nil,
            formatDescriptionOut: &desc
        )
        guard status == noErr, let desc else {
            throw RendererError.formatDescriptionFailed(status)
        }
        return desc
    }

    private static func makePixelBufferPool(width: Int, height: Int) throws
        -> CVPixelBufferPool
    {
        let attributes: NSDictionary = [
            kCVPixelBufferWidthKey: width,
            kCVPixelBufferHeightKey: height,
            kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
            kCVPixelBufferIOSurfacePropertiesKey: [:] as NSDictionary,
        ]
        var pool: CVPixelBufferPool?
        let status = CVPixelBufferPoolCreate(
            kCFAllocatorDefault,
            nil,
            attributes,
            &pool
        )
        guard status == kCVReturnSuccess, let pool else {
            throw RendererError.pixelBufferPoolFailed(status)
        }
        return pool
    }
}

// MARK: - CIImage scaling helper

extension CIImage {
    /// Scales the image to fit inside `outputRect`, letterboxing as needed.
    fileprivate func scaledToFit(in outputRect: CGRect) -> CIImage {
        let extent = extent.integral
        guard extent.width > 0, extent.height > 0 else { return self }

        let scale = min(
            outputRect.width / extent.width,
            outputRect.height / extent.height
        )
        let scaled = transformed(by: CGAffineTransform(scaleX: scale, y: scale))

        let xOffset = (outputRect.width - scaled.extent.width) / 2
        let yOffset = (outputRect.height - scaled.extent.height) / 2

        return scaled.transformed(
            by: CGAffineTransform(
                translationX: xOffset - scaled.extent.minX,
                y: yOffset - scaled.extent.minY
            )
        )
    }
}
