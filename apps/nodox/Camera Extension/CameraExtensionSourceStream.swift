//
//  CameraExtensionSourceStream.swift
//  Camera Extension
//
//  Created by Codex on 20.04.26.
//

import AppKit
import CoreMediaIO
import CoreVideo
import Foundation
import os.log

final class CameraExtensionSourceStream: NSObject, CMIOExtensionStreamSource {
    private let streamID: UUID
    private let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier
            ?? "com.buildergroup.nodox.camera-extension",
        category: "SourceStream"
    )
    private let timerQueue = DispatchQueue(
        label: "com.buildergroup.nodox.camera-source-stream",
        qos: .userInteractive
    )
    private let bufferLock = NSLock()

    private var frameTimer: DispatchSourceTimer?
    private var isStreaming = false
    private var latestPixelBuffer: CVPixelBuffer?
    private let fallbackBufferPool: CVPixelBufferPool
    private(set) lazy var stream = CMIOExtensionStream(
        localizedName: CameraExtensionConstants.sourceStreamName,
        streamID: streamID,
        direction: .source,
        clockType: .hostTime,
        source: self
    )

    static let frameDuration = CMTime(
        value: 1,
        timescale: CMTimeScale(CameraExtensionConstants.frameRate)
    )
    private static let formatDescription: CMFormatDescription = {
        var formatDescription: CMFormatDescription?
        CMVideoFormatDescriptionCreate(
            allocator: kCFAllocatorDefault,
            codecType: kCVPixelFormatType_32BGRA,
            width: Int32(CameraExtensionConstants.width),
            height: Int32(CameraExtensionConstants.height),
            extensions: nil,
            formatDescriptionOut: &formatDescription
        )
        guard let formatDescription else {
            fatalError(
                "Failed to create NoDox source stream format description"
            )
        }
        return formatDescription
    }()
    static let supportedFormats = [
        CMIOExtensionStreamFormat(
            formatDescription: formatDescription,
            maxFrameDuration: frameDuration,
            minFrameDuration: frameDuration,
            validFrameDurations: nil
        )
    ]

    init(streamID: UUID) {
        self.streamID = streamID
        fallbackBufferPool = Self.makePixelBufferPool()

        super.init()
    }

    var formats: [CMIOExtensionStreamFormat] {
        Self.supportedFormats
    }

    var activeFormatIndex: Int = 0

    var availableProperties: Set<CMIOExtensionProperty> {
        [.streamActiveFormatIndex, .streamFrameDuration]
    }

    func streamProperties(forProperties properties: Set<CMIOExtensionProperty>)
        throws -> CMIOExtensionStreamProperties
    {
        let streamProperties = CMIOExtensionStreamProperties(dictionary: [:])

        if properties.contains(.streamActiveFormatIndex) {
            streamProperties.activeFormatIndex = 0
        }

        if properties.contains(.streamFrameDuration) {
            streamProperties.frameDuration = Self.frameDuration
        }

        return streamProperties
    }

    func setStreamProperties(_ streamProperties: CMIOExtensionStreamProperties)
        throws
    {
        if let activeFormatIndex = streamProperties.activeFormatIndex {
            self.activeFormatIndex = activeFormatIndex
        }
    }

    func authorizedToStartStream(for client: CMIOExtensionClient) -> Bool {
        true
    }

    func startStream() throws {
        guard !isStreaming else {
            return
        }

        isStreaming = true

        let timer = DispatchSource.makeTimerSource(queue: timerQueue)
        timer.schedule(
            deadline: .now(),
            repeating: 1.0 / Double(CameraExtensionConstants.frameRate)
        )
        timer.setEventHandler { [weak self] in
            self?.sendCurrentFrame()
        }
        frameTimer = timer
        timer.resume()

        logger.info("Started NoDox source stream")
    }

    func stopStream() throws {
        guard isStreaming else {
            return
        }

        isStreaming = false
        frameTimer?.cancel()
        frameTimer = nil

        logger.info("Stopped NoDox source stream")
    }

    func updateLatestPixelBuffer(_ pixelBuffer: CVPixelBuffer) {
        bufferLock.lock()
        latestPixelBuffer = pixelBuffer
        bufferLock.unlock()
    }

    private func sendCurrentFrame() {
        guard isStreaming else {
            return
        }

        let now = CMClockGetTime(CMClockGetHostTimeClock())
        let pixelBuffer = dequeuePixelBuffer() ?? makeFallbackPixelBuffer()

        guard let pixelBuffer else {
            return
        }

        var timingInfo = CMSampleTimingInfo(
            duration: Self.frameDuration,
            presentationTimeStamp: now,
            decodeTimeStamp: .invalid
        )

        var sampleBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            formatDescription: Self.formatDescription,
            sampleTiming: &timingInfo,
            sampleBufferOut: &sampleBuffer
        )

        guard status == noErr, let sampleBuffer else {
            return
        }

        stream.send(
            sampleBuffer,
            discontinuity: [],
            hostTimeInNanoseconds: UInt64(now.seconds * Double(NSEC_PER_SEC))
        )
    }

    private func dequeuePixelBuffer() -> CVPixelBuffer? {
        bufferLock.lock()
        defer { bufferLock.unlock() }
        return latestPixelBuffer
    }

    private func makeFallbackPixelBuffer() -> CVPixelBuffer? {
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferPoolCreatePixelBuffer(
            kCFAllocatorDefault,
            fallbackBufferPool,
            &pixelBuffer
        )
        guard status == kCVReturnSuccess, let pixelBuffer else {
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
        else {
            return pixelBuffer
        }

        let bounds = CGRect(
            x: 0,
            y: 0,
            width: CameraExtensionConstants.width,
            height: CameraExtensionConstants.height
        )

        context.setFillColor(NSColor.black.cgColor)
        context.fill(bounds)

        let title = NSAttributedString(
            string: CameraExtensionConstants.fallbackTitle,
            attributes: [
                .font: NSFont.monospacedSystemFont(ofSize: 32, weight: .bold),
                .foregroundColor: NSColor.white,
            ]
        )

        let subtitle = NSAttributedString(
            string: CameraExtensionConstants.fallbackSubtitle,
            attributes: [
                .font: NSFont.systemFont(ofSize: 20, weight: .medium),
                .foregroundColor: NSColor.white.withAlphaComponent(0.82),
            ]
        )

        let graphicsContext = NSGraphicsContext(
            cgContext: context,
            flipped: false
        )
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = graphicsContext
        title.draw(at: CGPoint(x: 56, y: bounds.height - 90))
        subtitle.draw(at: CGPoint(x: 56, y: bounds.height - 130))
        NSGraphicsContext.restoreGraphicsState()

        return pixelBuffer
    }

    private static func makePixelBufferPool() -> CVPixelBufferPool {
        let attributes: NSDictionary = [
            kCVPixelBufferWidthKey: CameraExtensionConstants.width,
            kCVPixelBufferHeightKey: CameraExtensionConstants.height,
            kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
            kCVPixelBufferIOSurfacePropertiesKey: [:] as NSDictionary,
        ]

        var pool: CVPixelBufferPool?
        CVPixelBufferPoolCreate(kCFAllocatorDefault, nil, attributes, &pool)

        guard let pool else {
            fatalError("Failed to create NoDox fallback pixel buffer pool")
        }

        return pool
    }
}
