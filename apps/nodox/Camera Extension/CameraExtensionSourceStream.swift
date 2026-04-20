//
//  CameraExtensionSourceStream.swift
//  Camera Extension
//

import AppKit
import CoreMediaIO
import CoreVideo
import Foundation
import OSLog

/// The CMIO source stream that delivers frames to video consumers (e.g. Zoom, FaceTime).
///
/// A `DispatchSourceTimer` fires at the configured frame rate. On each tick,
/// `sendCurrentFrame()` grabs the latest pixel buffer pushed by the sink stream
/// (or renders a fallback frame) and sends it to CMIO.
final class CameraExtensionSourceStream: NSObject, CMIOExtensionStreamSource {

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier
            ?? "com.buildergroup.nodox.camera-extension",
        category: "SourceStream"
    )

    // MARK: - Format (static, shared with SinkStream)

    static let frameDuration = CMTime(
        value: 1,
        timescale: CMTimeScale(CameraExtensionConstants.frameRate)
    )

    // nil only on catastrophic OOM; supportedFormats returns [] in that case so CMIO clients skip the stream
    private static let formatDescription: CMFormatDescription? = {
        var desc: CMFormatDescription?
        let status = CMVideoFormatDescriptionCreate(
            allocator: kCFAllocatorDefault,
            codecType: kCVPixelFormatType_32BGRA,
            width: Int32(CameraExtensionConstants.width),
            height: Int32(CameraExtensionConstants.height),
            extensions: nil,
            formatDescriptionOut: &desc
        )
        if status != noErr || desc == nil {
            logger.fault(
                "Failed to create source stream format description (OSStatus \(status)) — stream will advertise no formats"
            )
        }
        return desc
    }()

    static var supportedFormats: [CMIOExtensionStreamFormat] {
        guard let desc = formatDescription else { return [] }
        return [
            CMIOExtensionStreamFormat(
                formatDescription: desc,
                maxFrameDuration: frameDuration,
                minFrameDuration: frameDuration,
                validFrameDurations: nil
            )
        ]
    }

    private let streamID: UUID

    private(set) lazy var stream = CMIOExtensionStream(
        localizedName: CameraExtensionConstants.sourceStreamName,
        streamID: streamID,
        direction: .source,
        clockType: .hostTime,
        source: self
    )

    // Guards latestPixelBuffer: written by the sink stream callback, read by the timer
    private let bufferLock = NSLock()
    private var latestPixelBuffer: CVPixelBuffer?

    // Rendered once at init; shown before the main app connects. Nil only on severe resource exhaustion.
    private let fallbackPixelBuffer: CVPixelBuffer?

    private let timerQueue = DispatchQueue(
        label: "com.buildergroup.nodox.camera-source-stream",
        qos: .userInteractive
    )
    private var frameTimer: DispatchSourceTimer?
    private var isStreaming = false

    var activeFormatIndex: Int = 0

    init(streamID: UUID) {
        self.streamID = streamID
        self.fallbackPixelBuffer = Self.makeAndRenderFallbackPixelBuffer()
        super.init()
    }

    // MARK: - CMIOExtensionStreamSource

    var formats: [CMIOExtensionStreamFormat] { Self.supportedFormats }

    var availableProperties: Set<CMIOExtensionProperty> {
        [.streamActiveFormatIndex, .streamFrameDuration]
    }

    func streamProperties(forProperties properties: Set<CMIOExtensionProperty>)
        throws -> CMIOExtensionStreamProperties
    {
        let props = CMIOExtensionStreamProperties(dictionary: [:])
        if properties.contains(.streamActiveFormatIndex) {
            props.activeFormatIndex = 0
        }
        if properties.contains(.streamFrameDuration) {
            props.frameDuration = Self.frameDuration
        }
        return props
    }

    func setStreamProperties(_ streamProperties: CMIOExtensionStreamProperties)
        throws
    {
        if let index = streamProperties.activeFormatIndex {
            activeFormatIndex = index
        }
    }

    func authorizedToStartStream(for client: CMIOExtensionClient) -> Bool {
        true
    }

    func startStream() throws {
        guard !isStreaming else { return }
        isStreaming = true

        let timer = DispatchSource.makeTimerSource(queue: timerQueue)
        timer.schedule(
            deadline: .now(),
            repeating: 1.0 / Double(CameraExtensionConstants.frameRate)
        )
        timer.setEventHandler { [weak self] in self?.sendCurrentFrame() }
        frameTimer = timer
        timer.resume()

        Self.logger.info("Started NoDox source stream")
    }

    func stopStream() throws {
        guard isStreaming else { return }
        isStreaming = false
        frameTimer?.cancel()
        frameTimer = nil
        Self.logger.info("Stopped NoDox source stream")
    }

    // MARK: - Buffer handoff from sink stream

    func updateLatestPixelBuffer(_ pixelBuffer: CVPixelBuffer) {
        bufferLock.lock()
        latestPixelBuffer = pixelBuffer
        bufferLock.unlock()
    }

    // MARK: - Frame sending

    private func sendCurrentFrame() {
        guard isStreaming else { return }
        guard let formatDescription = Self.formatDescription else { return }

        let now = CMClockGetTime(CMClockGetHostTimeClock())
        let pixelBuffer = dequeueLatestPixelBuffer() ?? fallbackPixelBuffer
        guard let pixelBuffer else { return }

        var timing = CMSampleTimingInfo(
            duration: Self.frameDuration,
            presentationTimeStamp: now,
            decodeTimeStamp: .invalid
        )
        var sampleBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            formatDescription: formatDescription,
            sampleTiming: &timing,
            sampleBufferOut: &sampleBuffer
        )
        guard status == noErr, let sampleBuffer else { return }

        stream.send(
            sampleBuffer,
            discontinuity: [],
            hostTimeInNanoseconds: UInt64(now.seconds * Double(NSEC_PER_SEC))
        )
    }

    private func dequeueLatestPixelBuffer() -> CVPixelBuffer? {
        bufferLock.lock()
        defer { bufferLock.unlock() }
        // We read without clearing, so the same frame repeats at the configured frame rate
        // until the sink stream pushes a newer buffer. This keeps the output smooth during
        // brief gaps rather than cutting to the fallback frame on every missed delivery.
        return latestPixelBuffer
    }

    // MARK: - Fallback frame

    // Creates one pixel buffer and renders the static fallback frame into it.
    // Called once at init; the result is reused for every tick that has no sink frame.
    private static func makeAndRenderFallbackPixelBuffer() -> CVPixelBuffer? {
        let attributes: NSDictionary = [
            kCVPixelBufferWidthKey: CameraExtensionConstants.width,
            kCVPixelBufferHeightKey: CameraExtensionConstants.height,
            kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
            kCVPixelBufferIOSurfacePropertiesKey: [:] as NSDictionary,
        ]
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            CameraExtensionConstants.width,
            CameraExtensionConstants.height,
            kCVPixelFormatType_32BGRA,
            attributes,
            &pixelBuffer
        )
        guard status == kCVReturnSuccess, let pixelBuffer else {
            logger.fault(
                "Failed to create fallback pixel buffer (CVReturn \(status)) — fallback frames disabled"
            )
            return nil
        }

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
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue
                    | CGImageAlphaInfo.premultipliedFirst.rawValue
            )
        else { return pixelBuffer }

        let bounds = CGRect(
            x: 0,
            y: 0,
            width: CameraExtensionConstants.width,
            height: CameraExtensionConstants.height
        )
        context.setFillColor(NSColor.black.cgColor)
        context.fill(bounds)

        // NSAttributedString.draw requires an NSGraphicsContext; we bridge from
        // the CGContext we created directly on the pixel buffer's base address
        let graphicsContext = NSGraphicsContext(
            cgContext: context,
            flipped: false
        )
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = graphicsContext

        NSAttributedString(
            string: CameraExtensionConstants.fallbackTitle,
            attributes: [
                .font: NSFont.monospacedSystemFont(ofSize: 32, weight: .bold),
                .foregroundColor: NSColor.white,
            ]
        ).draw(at: CGPoint(x: 56, y: bounds.height - 90))

        NSAttributedString(
            string: CameraExtensionConstants.fallbackSubtitle,
            attributes: [
                .font: NSFont.systemFont(ofSize: 20, weight: .medium),
                .foregroundColor: NSColor.white.withAlphaComponent(0.82),
            ]
        ).draw(at: CGPoint(x: 56, y: bounds.height - 130))

        NSGraphicsContext.restoreGraphicsState()
        return pixelBuffer
    }
}
