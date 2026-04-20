import CoreMediaIO
import Foundation
import OSLog

/// Top-level CMIO extension provider. Owns the camera device source.
final class CameraExtensionProviderSource: NSObject, CMIOExtensionProviderSource
{

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier
            ?? "com.buildergroup.nodox.camera-extension",
        category: "ProviderSource"
    )

    private let deviceSource: CameraExtensionDeviceSource

    private(set) lazy var provider = CMIOExtensionProvider(
        source: self,
        clientQueue: nil
    )

    override init() {
        deviceSource = CameraExtensionDeviceSource()
        super.init()

        // `addDevice` only fails if the same device is added twice (programmer error)
        let provider = self.provider
        do {
            try provider.addDevice(deviceSource.device)
        } catch {
            Self.logger.fault(
                "Failed to add camera device: \(error.localizedDescription, privacy: .public)"
            )
            fatalError(
                "Failed to add NoDox camera device: \(error.localizedDescription)"
            )
        }
    }

    // MARK: - CMIOExtensionProviderSource

    func connect(to client: CMIOExtensionClient) throws {}
    func disconnect(from client: CMIOExtensionClient) {}

    var availableProperties: Set<CMIOExtensionProperty> {
        [.providerManufacturer]
    }

    func providerProperties(
        forProperties properties: Set<CMIOExtensionProperty>
    ) throws -> CMIOExtensionProviderProperties {
        let props = CMIOExtensionProviderProperties(dictionary: [:])
        if properties.contains(.providerManufacturer) {
            props.manufacturer = CameraExtensionConstants.manufacturerName
        }
        return props
    }

    func setProviderProperties(
        _ providerProperties: CMIOExtensionProviderProperties
    ) throws {}
}
