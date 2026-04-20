import AVFoundation
import AppKit
import SwiftUI

/// Displays frames from an AVSampleBufferDisplayLayer inside SwiftUI.
///
/// The caller owns the layer and enqueues sample buffers into it.
/// This view just hosts it inside an NSView that keeps its frame in sync.
struct SampleBufferPreviewView: NSViewRepresentable {
    let layer: AVSampleBufferDisplayLayer

    func makeNSView(context: Context) -> NSView {
        PreviewNSView(displayLayer: layer)
    }

    func updateNSView(_ nsView: NSView, context: Context) {}
}

private final class PreviewNSView: NSView {
    private let displayLayer: AVSampleBufferDisplayLayer

    init(displayLayer: AVSampleBufferDisplayLayer) {
        self.displayLayer = displayLayer
        super.init(frame: .zero)
        wantsLayer = true
        layer?.addSublayer(displayLayer)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not supported") }

    override func layout() {
        super.layout()
        // Disable implicit animations so the layer snaps to new bounds without delay
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        displayLayer.frame = bounds
        CATransaction.commit()
    }
}
