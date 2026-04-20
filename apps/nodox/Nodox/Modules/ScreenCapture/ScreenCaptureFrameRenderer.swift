//
//  ScreenCaptureFrameRenderer.swift
//  Nodox
//
//  Created by Codex on 20.04.26.
//

import AppKit
import CoreImage
import CoreMedia
import CoreVideo
import Foundation

final class ScreenCaptureFrameRenderer {
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

    init() {
        outputFormatDescription = Self.makeVideoFormatDescription(
            width: AppConfig.videoWidth,
            height: AppConfig.videoHeight
        )
        pixelBufferPool = Self.makePixelBufferPool(
            width: AppConfig.videoWidth,
            height: AppConfig.videoHeight
        )
    }

    func makeSampleBuffer(from sourceBuffer: CMSampleBuffer) -> CMSampleBuffer?
    {
        guard
            let sourcePixelBuffer = CMSampleBufferGetImageBuffer(sourceBuffer),
            let pixelBuffer = makePixelBuffer()
        else {
            return nil
        }

        let sourceImage = CIImage(cvPixelBuffer: sourcePixelBuffer)
        let framedImage =
            sourceImage
            .scaledToFit(in: outputRect)
            .composited(over: CIImage(color: .black).cropped(to: outputRect))

        ciContext.render(
            framedImage,
            to: pixelBuffer,
            bounds: outputRect,
            colorSpace: colorSpace
        )
        drawOverlay(on: pixelBuffer)

        var timingInfo = CMSampleTimingInfo(
            duration: CMTime(
                value: 1,
                timescale: CMTimeScale(AppConfig.videoFrameRate)
            ),
            presentationTimeStamp: sourceBuffer.presentationTimeStamp,
            decodeTimeStamp: .invalid
        )

        if !timingInfo.presentationTimeStamp.isValid {
            timingInfo.presentationTimeStamp = CMClockGetTime(
                CMClockGetHostTimeClock()
            )
        }

        var sampleBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            formatDescription: outputFormatDescription,
            sampleTiming: &timingInfo,
            sampleBufferOut: &sampleBuffer
        )

        guard status == noErr else {
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
            return nil
        }

        return pixelBuffer
    }

    private func drawOverlay(on pixelBuffer: CVPixelBuffer) {
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
        else {
            return
        }

        let overlayRect = AppConfig.overlayRect

        context.setFillColor(NSColor.systemRed.withAlphaComponent(0.22).cgColor)
        context.fill(overlayRect)

        context.setStrokeColor(NSColor.systemRed.cgColor)
        context.setLineWidth(4)
        context.stroke(overlayRect)

        let graphicsContext = NSGraphicsContext(
            cgContext: context,
            flipped: false
        )
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = graphicsContext

        let label = NSAttributedString(
            string: AppConfig.overlayLabel,
            attributes: [
                .font: NSFont.monospacedSystemFont(
                    ofSize: 20,
                    weight: .semibold
                ),
                .foregroundColor: NSColor.white,
            ]
        )

        let textOrigin = CGPoint(
            x: overlayRect.minX + 18,
            y: overlayRect.minY + overlayRect.height - 42
        )
        label.draw(at: textOrigin)

        NSGraphicsContext.restoreGraphicsState()
    }

    private static func makeVideoFormatDescription(width: Int, height: Int)
        -> CMFormatDescription
    {
        var formatDescription: CMFormatDescription?
        CMVideoFormatDescriptionCreate(
            allocator: kCFAllocatorDefault,
            codecType: kCVPixelFormatType_32BGRA,
            width: Int32(width),
            height: Int32(height),
            extensions: nil,
            formatDescriptionOut: &formatDescription
        )

        guard let formatDescription else {
            fatalError("Failed to create NoDox render format description")
        }

        return formatDescription
    }

    private static func makePixelBufferPool(width: Int, height: Int)
        -> CVPixelBufferPool
    {
        let attributes: NSDictionary = [
            kCVPixelBufferWidthKey: width,
            kCVPixelBufferHeightKey: height,
            kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
            kCVPixelBufferIOSurfacePropertiesKey: [:] as NSDictionary,
        ]

        var pool: CVPixelBufferPool?
        CVPixelBufferPoolCreate(kCFAllocatorDefault, nil, attributes, &pool)

        guard let pool else {
            fatalError("Failed to create NoDox render pixel buffer pool")
        }

        return pool
    }
}

extension CIImage {
    fileprivate func scaledToFit(in outputRect: CGRect) -> CIImage {
        let extent = extent.integral
        guard extent.width > 0, extent.height > 0 else {
            return self
        }

        let scale = min(
            outputRect.width / extent.width,
            outputRect.height / extent.height
        )
        let scaledImage = transformed(
            by: CGAffineTransform(scaleX: scale, y: scale)
        )

        let xOffset = (outputRect.width - scaledImage.extent.width) / 2
        let yOffset = (outputRect.height - scaledImage.extent.height) / 2

        return scaledImage.transformed(
            by: CGAffineTransform(
                translationX: xOffset - scaledImage.extent.minX,
                y: yOffset - scaledImage.extent.minY
            )
        )
    }
}
