//
//  CameraExtensionDeviceSource.swift
//  Camera Extension
//

import CoreMediaIO
import Foundation
import IOKit.audio
import OSLog

/// Owns the virtual camera device and wires together the source and sink streams.
final class CameraExtensionDeviceSource: NSObject, CMIOExtensionDeviceSource {

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier
            ?? "com.buildergroup.nodox.camera-extension",
        category: "DeviceSource"
    )

    private let sourceStream: CameraExtensionSourceStream
    private let sinkStream: CameraExtensionSinkStream

    private(set) lazy var device = CMIOExtensionDevice(
        localizedName: CameraExtensionConstants.deviceName,
        deviceID: CameraExtensionConstants.deviceID,
        legacyDeviceID: nil,
        source: self
    )

    override init() {
        sourceStream = CameraExtensionSourceStream(
            streamID: CameraExtensionConstants.sourceStreamID
        )
        sinkStream = CameraExtensionSinkStream(
            streamID: CameraExtensionConstants.sinkStreamID
        )
        super.init()

        sinkStream.sourceStream = sourceStream

        // `addStream` only fails if the same stream is added twice (programmer error)
        let device = self.device
        do {
            try device.addStream(sourceStream.stream)
            try device.addStream(sinkStream.stream)
        } catch {
            Self.logger.fault(
                "Failed to add camera streams: \(error.localizedDescription, privacy: .public)"
            )
            fatalError(
                "Failed to add NoDox camera streams: \(error.localizedDescription)"
            )
        }
    }

    // MARK: - CMIOExtensionDeviceSource

    var availableProperties: Set<CMIOExtensionProperty> {
        [.deviceTransportType, .deviceModel]
    }

    func deviceProperties(forProperties properties: Set<CMIOExtensionProperty>)
        throws -> CMIOExtensionDeviceProperties
    {
        let props = CMIOExtensionDeviceProperties(dictionary: [:])
        if properties.contains(.deviceTransportType) {
            props.transportType = kIOAudioDeviceTransportTypeVirtual
        }
        if properties.contains(.deviceModel) {
            props.model = CameraExtensionConstants.deviceName
        }
        return props
    }

    func setDeviceProperties(_ deviceProperties: CMIOExtensionDeviceProperties)
        throws
    {}
}
