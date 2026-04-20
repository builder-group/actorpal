import ScreenCaptureKit

/// Describes what NoDox captures: the full main display or a specific window.
enum CaptureTarget: Identifiable, Hashable {
    case display(SCDisplay)
    case window(SCWindow)

    var id: String {
        switch self {
        case .display(let d): return "display-\(d.displayID)"
        case .window(let w): return "window-\(w.windowID)"
        }
    }

    var displayName: String {
        switch self {
        case .display(let d):
            return "Full Display (\(d.width)×\(d.height))"
        case .window(let w):
            let app = w.owningApplication?.applicationName ?? ""
            let title = w.title ?? ""
            if !app.isEmpty && !title.isEmpty { return "\(app) — \(title)" }
            if !app.isEmpty { return app }
            if !title.isEmpty { return title }
            return "Window \(w.windowID)"
        }
    }

    static func == (lhs: CaptureTarget, rhs: CaptureTarget) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}
