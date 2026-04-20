import Foundation

/// Compiles user-provided regex patterns and matches them against Vision OCR text.
///
/// The matcher is shared between SwiftUI controls on the main thread and the
/// screen-capture render queue, so reads and writes are protected by a lock.
final class SensitiveTextMatcher {

    struct PatternError: Equatable {
        let index: Int
        let message: String
    }

    struct UpdateResult: Equatable {
        let activePatternCount: Int
        let errors: [PatternError]
    }

    private struct CompiledPattern {
        let regex: NSRegularExpression
    }

    private let lock = NSLock()
    private var compiledPatterns: [CompiledPattern] = []

    init(patterns: [String] = AppConfig.defaultRedactionPatterns) {
        _ = updatePatterns(patterns)
    }

    @discardableResult
    func updatePatterns(_ patterns: [String]) -> UpdateResult {
        var compiled: [CompiledPattern] = []
        var compileErrors: [PatternError] = []

        for (index, rawPattern) in patterns.enumerated() {
            let pattern = rawPattern.trimmingCharacters(
                in: .whitespacesAndNewlines
            )
            guard !pattern.isEmpty else { continue }

            do {
                compiled.append(
                    CompiledPattern(
                        regex: try NSRegularExpression(pattern: pattern)
                    )
                )
            } catch {
                compileErrors.append(
                    PatternError(
                        index: index,
                        message: error.localizedDescription
                    )
                )
            }
        }

        lock.lock()
        compiledPatterns = compiled
        lock.unlock()

        return UpdateResult(
            activePatternCount: compiled.count,
            errors: compileErrors
        )
    }

    func matchedDetections(
        in detections: [VisionTextDetector.DetectedText]
    ) -> [VisionTextDetector.DetectedText] {
        lock.lock()
        let patterns = compiledPatterns
        lock.unlock()

        guard !patterns.isEmpty else { return [] }

        return detections.filter { detection in
            let range = NSRange(
                detection.text.startIndex..<detection.text.endIndex,
                in: detection.text
            )
            return patterns.contains { compiled in
                compiled.regex.firstMatch(
                    in: detection.text,
                    options: [],
                    range: range
                ) != nil
            }
        }
    }
}
