import CoreVideo
import Foundation
import OSLog
import Vision

/// Detects text regions in pixel buffers using Apple Vision.
///
/// `detect(in:)` is non-blocking: it returns the last cached result immediately
/// and schedules a new Vision request asynchronously when the minimum detection
/// interval has elapsed and no request is already in flight.
final class VisionTextDetector {

    struct DetectedText {
        let text: String
        // Bounding box in pixel coordinates of the source image.
        // Uses CGContext convention: origin at bottom-left, Y increases upward.
        // VNImageRectForNormalizedRect produces this coordinate space directly —
        // no additional flip is needed when drawing on a CVPixelBuffer CGContext.
        let boundingBox: CGRect
    }

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.buildergroup.nodox",
        category: "VisionTextDetector"
    )

    // Dedicated queue so Vision never blocks the SCStream sample-handler queue.
    private let detectionQueue = DispatchQueue(
        label: "com.buildergroup.nodox.vision",
        qos: .userInitiated
    )

    // Written from main thread, read on detectionQueue. Scalar types are
    // single-instruction on arm64 — a stale read trails a UI change by at most
    // one detection cycle, which is fine for interactive experimentation.
    var recognitionLevel: VNRequestTextRecognitionLevel = .accurate
    var minimumTextHeight: Float = 0.008

    private let lock = NSLock()
    private var lastResult: [DetectedText] = []
    private var isRunning = false
    private var lastRunTime: Date = .distantPast

    /// Returns the most recent detection result and schedules a new Vision run
    /// if `AppConfig.visionThrottleInterval` has elapsed and no run is in flight.
    func detect(in pixelBuffer: CVPixelBuffer) -> [DetectedText] {
        lock.lock()
        let cached = lastResult
        let now = Date()
        let shouldSchedule =
            !isRunning
            && now.timeIntervalSince(lastRunTime)
                >= AppConfig.visionThrottleInterval
        if shouldSchedule {
            isRunning = true
            lastRunTime = now
        }
        lock.unlock()

        if shouldSchedule {
            detectionQueue.async { [weak self] in
                guard let self else { return }
                let result = self.runVision(on: pixelBuffer)
                self.lock.lock()
                self.lastResult = result
                self.isRunning = false
                self.lock.unlock()
            }
        }

        return cached
    }

    private func runVision(on pixelBuffer: CVPixelBuffer) -> [DetectedText] {
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = recognitionLevel
        request.usesLanguageCorrection = false
        request.minimumTextHeight = minimumTextHeight

        let handler = VNImageRequestHandler(
            cvPixelBuffer: pixelBuffer,
            options: [:]
        )
        do {
            try handler.perform([request])
        } catch {
            Self.logger.error(
                "Vision request failed: \(error.localizedDescription, privacy: .public)"
            )
            return []
        }

        return (request.results ?? []).compactMap { observation in
            guard let candidate = observation.topCandidates(1).first else {
                return nil
            }
            let box = VNImageRectForNormalizedRect(
                observation.boundingBox,
                width,
                height
            )
            return DetectedText(text: candidate.string, boundingBox: box)
        }
    }
}
