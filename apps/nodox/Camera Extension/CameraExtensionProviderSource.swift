//
//  CameraExtensionProviderSource.swift
//  Camera Extension
//
//  Created by Codex on 20.04.26.
//

import CoreMediaIO
import Foundation

final class CameraExtensionProviderSource: NSObject, CMIOExtensionProviderSource
{
    private let clientQueue: DispatchQueue?
    private let deviceSource: CameraExtensionDeviceSource
    private(set) lazy var provider = CMIOExtensionProvider(
        source: self,
        clientQueue: clientQueue
    )

    init(clientQueue: DispatchQueue?) {
        self.clientQueue = clientQueue
        deviceSource = CameraExtensionDeviceSource(
            localizedName: CameraExtensionConstants.deviceName
        )

        super.init()

        let cameraProvider = provider

        do {
            try cameraProvider.addDevice(deviceSource.device)
        } catch {
            fatalError(
                "Failed to add NoDox camera device: \(error.localizedDescription)"
            )
        }
    }

    func connect(to client: CMIOExtensionClient) throws {}

    func disconnect(from client: CMIOExtensionClient) {}

    var availableProperties: Set<CMIOExtensionProperty> {
        [.providerManufacturer]
    }

    func providerProperties(
        forProperties properties: Set<CMIOExtensionProperty>
    ) throws -> CMIOExtensionProviderProperties {
        let providerProperties = CMIOExtensionProviderProperties(dictionary: [:]
        )

        if properties.contains(.providerManufacturer) {
            providerProperties.manufacturer =
                CameraExtensionConstants.manufacturerName
        }

        return providerProperties
    }

    func setProviderProperties(
        _ providerProperties: CMIOExtensionProviderProperties
    ) throws {}
}
