//
//  CameraExtensionDeviceSource.swift
//  Camera Extension
//
//  Created by Codex on 20.04.26.
//

import CoreMediaIO
import Foundation
import IOKit.audio

final class CameraExtensionDeviceSource: NSObject, CMIOExtensionDeviceSource {
    private let localizedName: String
    private let sourceStream: CameraExtensionSourceStream
    private let sinkStream: CameraExtensionSinkStream
    private(set) lazy var device = CMIOExtensionDevice(
        localizedName: localizedName,
        deviceID: CameraExtensionConstants.deviceID,
        legacyDeviceID: nil,
        source: self
    )

    init(localizedName: String) {
        self.localizedName = localizedName
        sourceStream = CameraExtensionSourceStream(
            streamID: CameraExtensionConstants.sourceStreamID
        )
        sinkStream = CameraExtensionSinkStream(
            streamID: CameraExtensionConstants.sinkStreamID
        )

        super.init()

        sinkStream.sourceStream = sourceStream
        let cameraDevice = device

        do {
            try cameraDevice.addStream(sourceStream.stream)
            try cameraDevice.addStream(sinkStream.stream)
        } catch {
            fatalError(
                "Failed to add NoDox camera streams: \(error.localizedDescription)"
            )
        }
    }

    var availableProperties: Set<CMIOExtensionProperty> {
        [.deviceTransportType, .deviceModel]
    }

    func deviceProperties(forProperties properties: Set<CMIOExtensionProperty>)
        throws -> CMIOExtensionDeviceProperties
    {
        let deviceProperties = CMIOExtensionDeviceProperties(dictionary: [:])

        if properties.contains(.deviceTransportType) {
            deviceProperties.transportType = kIOAudioDeviceTransportTypeVirtual
        }

        if properties.contains(.deviceModel) {
            deviceProperties.model = CameraExtensionConstants.deviceName
        }

        return deviceProperties
    }

    func setDeviceProperties(_ deviceProperties: CMIOExtensionDeviceProperties)
        throws
    {}
}
