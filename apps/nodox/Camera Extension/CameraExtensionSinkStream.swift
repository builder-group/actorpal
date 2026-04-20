//
//  CameraExtensionSinkStream.swift
//  Camera Extension
//
//  Created by Codex on 20.04.26.
//

import CoreMediaIO
import Foundation
import os.log

final class CameraExtensionSinkStream: NSObject, CMIOExtensionStreamSource {
    private let streamID: UUID
    weak var sourceStream: CameraExtensionSourceStream?

    private let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier
            ?? "com.buildergroup.nodox.camera-extension",
        category: "SinkStream"
    )

    private var sinkClient: CMIOExtensionClient?
    private var isStreaming = false
    private(set) lazy var stream = CMIOExtensionStream(
        localizedName: CameraExtensionConstants.sinkStreamName,
        streamID: streamID,
        direction: .sink,
        clockType: .hostTime,
        source: self
    )

    static var supportedFormats: [CMIOExtensionStreamFormat] {
        CameraExtensionSourceStream.supportedFormats
    }

    init(streamID: UUID) {
        self.streamID = streamID
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
            streamProperties.frameDuration =
                CameraExtensionSourceStream.frameDuration
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
        sinkClient = client
        return true
    }

    func startStream() throws {
        guard !isStreaming else {
            return
        }

        guard let sinkClient else {
            logger.error("Sink stream started without an authorized client")
            return
        }

        isStreaming = true
        consumeNextBuffer(from: sinkClient)
        logger.info("Started NoDox sink stream")
    }

    func stopStream() throws {
        isStreaming = false
        sinkClient = nil
        logger.info("Stopped NoDox sink stream")
    }

    private func consumeNextBuffer(from client: CMIOExtensionClient) {
        guard isStreaming else {
            return
        }

        stream.consumeSampleBuffer(from: client) {
            [weak self] sampleBuffer, sequenceNumber, _, _, error in
            guard let self else {
                return
            }

            if let sampleBuffer,
                let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer)
            {
                self.sourceStream?.updateLatestPixelBuffer(pixelBuffer)

                let now = CMClockGetTime(CMClockGetHostTimeClock())
                let scheduledOutput = CMIOExtensionScheduledOutput(
                    sequenceNumber: sequenceNumber,
                    hostTimeInNanoseconds: UInt64(
                        now.seconds * Double(NSEC_PER_SEC)
                    )
                )
                self.stream.notifyScheduledOutputChanged(scheduledOutput)
                self.consumeNextBuffer(from: client)
                return
            }

            if let error {
                self.logger.error(
                    "Sink consume failed: \(error.localizedDescription, privacy: .public)"
                )
            }

            DispatchQueue.global(qos: .userInteractive).asyncAfter(
                deadline: .now() + 0.02
            ) {
                self.consumeNextBuffer(from: client)
            }
        }
    }
}
