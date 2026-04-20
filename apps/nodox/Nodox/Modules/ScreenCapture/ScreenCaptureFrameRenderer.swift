import AppKit
import CoreImage
import CoreMedia
import CoreVideo
import Foundation
import OSLog

/// How the source capture should be cropped before it reaches Vision and rendering.
enum CropMode: Hashable {
    case none
    /// Crops the largest centered region that matches the given aspect ratio.
    case centerAspect(width: Int, height: Int)
}

/// Converts a raw ScreenCaptureKit frame into a 1920×1080 BGRA sample buffer.
///
/// When `debugMode` is true, detected text bounding boxes from `detector` are
/// drawn as green outlines over the rendered frame.
///
/// One instance should live for the duration of a single capture session.
/// It is safe to call `makeSampleBuffer(from:)` from any thread.
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

    private let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.buildergroup.nodox",
        category: "FrameRenderer"
    )

    // Set by ScreenCaptureManager from the main thread; read from sampleHandlerQueue.
    // Bool loads/stores are single-instruction on arm64 — a stale read trails a toggle
    // by at most one frame, which is acceptable for a debug overlay.
    var debugMode = false
    // Injected before stream starts; cleared after stream stops.
    var detector: VisionTextDetector?

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

    // MARK: - Frame rendering

    /// Returns a new rendered sample buffer, or `nil` if a system resource was
    /// temporarily unavailable (e.g. pixel buffer pool exhausted).
    func makeSampleBuffer(from sourceBuffer: CMSampleBuffer) -> CMSampleBuffer?
    {
        guard
            let sourcePixelBuffer = CMSampleBufferGetImageBuffer(sourceBuffer),
            let pixelBuffer = makePixelBuffer()
        else {
            return nil
        }

        let sourceImage = CIImage(cvPixelBuffer: sourcePixelBuffer)

        // Schedule Vision detection on the incoming frame (non-blocking; returns
        // cached result). ScreenCaptureManager now applies source cropping at the
        // SCStream layer, so Vision only sees the already-cropped capture buffer.
        let sourceWidth = CGFloat(CVPixelBufferGetWidth(sourcePixelBuffer))
        let sourceHeight = CGFloat(CVPixelBufferGetHeight(sourcePixelBuffer))
        let textBoxes: [CGRect] =
            debugMode
            ? (detector?.detect(in: sourcePixelBuffer) ?? []).map { detected in
                return mapToOutput(
                    detected.boundingBox,
                    sourceWidth: sourceWidth,
                    sourceHeight: sourceHeight
                )
            }
            : []

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
        drawDebugBoxes(textBoxes, on: pixelBuffer)

        var timing = CMSampleTimingInfo(
            duration: CMTime(
                value: 1,
                timescale: CMTimeScale(AppConfig.videoFrameRate)
            ),
            presentationTimeStamp: sourceBuffer.presentationTimeStamp,
            decodeTimeStamp: .invalid
        )

        // Fall back to host clock if the source buffer carries no timestamp.
        // This can happen with certain SCStream configurations; Vision frameworks
        // tolerate host-time stamps fine since they treat each frame independently.
        if !timing.presentationTimeStamp.isValid {
            timing.presentationTimeStamp = CMClockGetTime(
                CMClockGetHostTimeClock()
            )
        }

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

    private func makePixelBuffer() -> CVPixelBuffer? {
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferPoolCreatePixelBuffer(
            kCFAllocatorDefault,
            pixelBufferPool,
            &pixelBuffer
        )
        guard status == kCVReturnSuccess else {
            logger.error(
                "Pixel buffer pool exhausted (CVReturn \(status)) — dropping frame"
            )
            return nil
        }
        return pixelBuffer
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

    private func drawDebugBoxes(
        _ boxes: [CGRect],
        on pixelBuffer: CVPixelBuffer
    ) {
        guard !boxes.isEmpty else { return }

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

        context.setStrokeColor(NSColor.systemGreen.cgColor)
        context.setFillColor(
            NSColor.systemGreen.withAlphaComponent(0.15).cgColor
        )
        context.setLineWidth(2)

        for box in boxes {
            context.fill(box)
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
