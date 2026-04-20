import AVFoundation
import CoreMedia
import CoreMediaIO
import Foundation
import OSLog

/// Connects to the virtual camera extension's CMIO sink stream and enqueues rendered frames.
///
/// Lifecycle:
///   1. Call `connectIfNeeded()` once (async; retries with backoff until the extension appears).
///   2. Call `enqueue(_:)` for every rendered frame.
///   3. Call `resetConnection()` to tear down (e.g. on stop or failure).
final class VirtualCameraSinkClient {

    // MARK: - Types

    enum EnqueueResult {
        case enqueued
        case droppedWaitingForConsumer
    }

    enum SinkError: LocalizedError {
        case discoverySetupFailed(OSStatus)
        case captureDeviceNotFound(requested: String, discovered: [String])
        case cmioDeviceNotFound(requestedUID: String, discovered: [String])
        case sinkStreamNotFound(requested: String, discovered: [String])
        case bufferQueueCopyFailed(OSStatus)
        case startStreamFailed(OSStatus)
        case enqueueFailed(OSStatus)

        // Device-not-yet-visible errors are transient; the extension registers a few
        // hundred milliseconds after the main app launches, so retrying is correct.
        var isRetryable: Bool {
            switch self {
            case .captureDeviceNotFound, .cmioDeviceNotFound,
                .sinkStreamNotFound:
                return true
            default:
                return false
            }
        }

        var errorDescription: String? {
            switch self {
            case .discoverySetupFailed(let status):
                return
                    "Could not enable virtual camera discovery (OSStatus \(status))."
            case .captureDeviceNotFound(let name, let discovered):
                let found =
                    discovered.isEmpty
                    ? "No cameras visible yet."
                    : "Visible: \(discovered.joined(separator: ", "))."
                return "The \(name) device is not available yet. \(found)"
            case .cmioDeviceNotFound(let uid, let discovered):
                let found =
                    discovered.isEmpty
                    ? "No CMIO UIDs visible yet."
                    : "Visible UIDs: \(discovered.joined(separator: ", "))."
                return
                    "Could not map AVFoundation UID \(uid) to a CMIO device. \(found)"
            case .sinkStreamNotFound(let name, let discovered):
                let found =
                    discovered.isEmpty
                    ? "No streams on the device."
                    : "Visible streams: \(discovered.joined(separator: ", "))."
                return "The \(name) input stream was not found. \(found)"
            case .bufferQueueCopyFailed(let status):
                return
                    "Could not open the camera input queue (OSStatus \(status))."
            case .startStreamFailed(let status):
                return
                    "Could not start the camera input stream (OSStatus \(status))."
            case .enqueueFailed(let status):
                return
                    "Failed to enqueue a frame for the virtual camera (OSStatus \(status))."
            }
        }
    }

    private static let maxConnectionAttempts = 8
    private static let retryDelayNanoseconds: UInt64 = 500_000_000  // 0.5 s

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.buildergroup.nodox",
        category: "VirtualCameraSink"
    )

    // All state is read/written under stateQueue to prevent data races between
    // the frame-enqueue path (sampleHandlerQueue) and the connect/reset path (async Task).
    private let stateQueue = DispatchQueue(
        label: "com.buildergroup.nodox.virtual-camera-sink"
    )

    private var sinkDeviceID: CMIODeviceID = 0
    private var sinkStreamID: CMIOStreamID = 0
    private var sinkQueue: CMSimpleQueue?
    private var readyToEnqueue = false

    // MARK: - Public API

    /// Connects to the virtual camera sink, retrying until the extension registers.
    ///
    /// Retries happen with async sleep so no dispatch queues are starved.
    /// Call this once before starting to enqueue frames.
    func connectIfNeeded() async throws {
        // Fast path: already connected
        if stateQueue.sync(execute: { sinkQueue != nil }) { return }

        // Required before CMIO will surface screen capture virtual devices
        try Self.enableVirtualCameraDiscovery()

        var lastError: Error?
        for attempt in 1...Self.maxConnectionAttempts {
            do {
                try stateQueue.sync { try self.connectLocked() }
                return
            } catch let error as SinkError where error.isRetryable {
                lastError = error
                Self.logger.info(
                    "Attempt \(attempt)/\(Self.maxConnectionAttempts): virtual camera not yet visible, retrying..."
                )
                if attempt < Self.maxConnectionAttempts {
                    try await Task.sleep(
                        nanoseconds: Self.retryDelayNanoseconds
                    )
                }
            }
        }

        throw lastError
            ?? SinkError.captureDeviceNotFound(
                requested: AppConfig.virtualCameraDeviceName,
                discovered: []
            )
    }

    /// Enqueues a rendered frame to the virtual camera sink.
    ///
    /// Returns `.droppedWaitingForConsumer` when the CMIO consumer has not yet signalled
    /// readiness, which is normal at startup and during brief pipeline stalls.
    func enqueue(_ sampleBuffer: CMSampleBuffer) throws -> EnqueueResult {
        try stateQueue.sync {
            guard readyToEnqueue, let sinkQueue else {
                return .droppedWaitingForConsumer
            }

            // One-shot: clear the flag now so we wait for the next consumer signal
            // before enqueuing again. CMIO calls back when it wants the next frame.
            readyToEnqueue = false

            let status = CMSimpleQueueEnqueue(
                sinkQueue,
                element: Unmanaged.passRetained(sampleBuffer).toOpaque()
            )
            guard status == noErr else {
                readyToEnqueue = true
                throw SinkError.enqueueFailed(status)
            }

            return .enqueued
        }
    }

    func resetConnection() {
        stateQueue.sync {
            if sinkDeviceID != 0, sinkStreamID != 0 {
                _ = CMIODeviceStopStream(sinkDeviceID, sinkStreamID)
            }
            sinkDeviceID = 0
            sinkStreamID = 0
            sinkQueue = nil
            readyToEnqueue = false
        }
    }

    // MARK: - Connection

    private func connectLocked() throws {
        guard sinkQueue == nil else { return }

        // CMIO doesn't expose a stable name we can search by directly. We go through
        // AVFoundation first to get the device's uniqueID, then use that to find the
        // matching CMIODeviceID in the CMIO object graph.
        let captureDevice = try Self.findCaptureDevice(
            named: AppConfig.virtualCameraDeviceName
        )
        Self.logger.info(
            "Resolved '\(captureDevice.localizedName, privacy: .public)' uid=\(captureDevice.uniqueID, privacy: .public)"
        )

        let deviceID = try Self.findCMIODevice(uid: captureDevice.uniqueID)
        Self.logger.info("Mapped to CMIO device \(deviceID)")

        let streamID = try Self.findStream(
            named: AppConfig.virtualCameraSinkStreamName,
            on: deviceID
        )
        Self.logger.info("Resolved sink stream \(streamID)")

        let refCon = Unmanaged.passUnretained(self).toOpaque()
        var queue: Unmanaged<CMSimpleQueue>?

        let bufferQueueStatus = CMIOStreamCopyBufferQueue(
            streamID,
            { _, _, refCon in
                guard let refCon else { return }
                // `passUnretained` is safe here: VirtualCameraSinkClient outlives the CMIO
                // queue because resetConnection() stops the stream and nils sinkQueue before
                // any owning reference to self can be dropped.
                Unmanaged<VirtualCameraSinkClient>.fromOpaque(refCon)
                    .takeUnretainedValue()
                    .markReadyToEnqueue()
            },
            refCon,
            &queue
        )

        guard bufferQueueStatus == noErr, let queue else {
            throw SinkError.bufferQueueCopyFailed(bufferQueueStatus)
        }

        let startStatus = CMIODeviceStartStream(deviceID, streamID)
        guard startStatus == noErr else {
            throw SinkError.startStreamFailed(startStatus)
        }

        sinkDeviceID = deviceID
        sinkStreamID = streamID
        sinkQueue = queue.takeRetainedValue()
        readyToEnqueue = true

        Self.logger.info("Connected to NoDox sink stream \(streamID)")
    }

    private func markReadyToEnqueue() {
        // Called from a C callback on a CMIO thread; async keeps that thread unblocked
        stateQueue.async {
            self.readyToEnqueue = true
        }
    }

    // MARK: - CMIO Discovery

    private static func enableVirtualCameraDiscovery() throws {
        var allow: UInt32 = 1
        var address = propertyAddress(
            for: CMIOObjectPropertySelector(
                kCMIOHardwarePropertyAllowScreenCaptureDevices
            )
        )
        let status = CMIOObjectSetPropertyData(
            CMIOObjectID(kCMIOObjectSystemObject),
            &address,
            0,
            nil,
            UInt32(MemoryLayout<UInt32>.size),
            &allow
        )
        guard status == noErr else {
            throw SinkError.discoverySetupFailed(status)
        }
    }

    private static func findCaptureDevice(named name: String) throws
        -> AVCaptureDevice
    {
        let session = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.external],
            mediaType: .video,
            position: .unspecified
        )
        let devices = session.devices
        logger.info(
            "AVFoundation discovered \(devices.count) camera(s): \(devices.map(\.localizedName).joined(separator: ", "), privacy: .public)"
        )
        guard let device = devices.first(where: { $0.localizedName == name })
        else {
            throw SinkError.captureDeviceNotFound(
                requested: name,
                discovered: devices.map(\.localizedName).sorted()
            )
        }
        return device
    }

    private static func findCMIODevice(uid: String) throws -> CMIODeviceID {
        var address = propertyAddress(
            for: CMIOObjectPropertySelector(kCMIOHardwarePropertyDevices)
        )
        var dataSize: UInt32 = 0

        guard
            CMIOObjectGetPropertyDataSize(
                CMIOObjectID(kCMIOObjectSystemObject),
                &address,
                0,
                nil,
                &dataSize
            ) == noErr
        else {
            throw SinkError.cmioDeviceNotFound(
                requestedUID: uid,
                discovered: []
            )
        }

        let count = Int(dataSize) / MemoryLayout<CMIODeviceID>.size
        var deviceIDs = [CMIODeviceID](repeating: 0, count: count)

        guard
            CMIOObjectGetPropertyData(
                CMIOObjectID(kCMIOObjectSystemObject),
                &address,
                0,
                nil,
                dataSize,
                &dataSize,
                &deviceIDs
            ) == noErr
        else {
            throw SinkError.cmioDeviceNotFound(
                requestedUID: uid,
                discovered: []
            )
        }

        var discovered: [String] = []
        for deviceID in deviceIDs {
            guard let deviceUID = objectUID(for: deviceID) else { continue }
            discovered.append(deviceUID)
            if deviceUID == uid { return deviceID }
        }

        logger.info(
            "Visible CMIO UIDs: \(discovered.joined(separator: ", "), privacy: .public)"
        )
        throw SinkError.cmioDeviceNotFound(
            requestedUID: uid,
            discovered: discovered
        )
    }

    private static func findStream(
        named name: String,
        on deviceID: CMIODeviceID
    ) throws -> CMIOStreamID {
        var address = propertyAddress(
            for: CMIOObjectPropertySelector(kCMIODevicePropertyStreams)
        )
        var dataSize: UInt32 = 0

        guard
            CMIOObjectGetPropertyDataSize(deviceID, &address, 0, nil, &dataSize)
                == noErr
        else {
            throw SinkError.sinkStreamNotFound(requested: name, discovered: [])
        }

        let count = Int(dataSize) / MemoryLayout<CMIOStreamID>.size
        var streamIDs = [CMIOStreamID](repeating: 0, count: count)

        guard
            CMIOObjectGetPropertyData(
                deviceID,
                &address,
                0,
                nil,
                dataSize,
                &dataSize,
                &streamIDs
            ) == noErr
        else {
            throw SinkError.sinkStreamNotFound(requested: name, discovered: [])
        }

        var discovered: [String] = []
        for streamID in streamIDs {
            let streamName = objectName(for: streamID) ?? "<unnamed>"
            discovered.append(streamName)
            if streamName == name { return streamID }
        }

        logger.info(
            "Streams on device \(deviceID): \(discovered.joined(separator: ", "), privacy: .public)"
        )
        throw SinkError.sinkStreamNotFound(
            requested: name,
            discovered: discovered
        )
    }

    private static func objectName(for objectID: CMIOObjectID) -> String? {
        var address = propertyAddress(
            for: CMIOObjectPropertySelector(kCMIOObjectPropertyName)
        )
        var dataSize = UInt32(MemoryLayout<CFString?>.size)
        var name: Unmanaged<CFString>?
        let status = withUnsafeMutablePointer(to: &name) {
            CMIOObjectGetPropertyData(
                objectID,
                &address,
                0,
                nil,
                dataSize,
                &dataSize,
                $0
            )
        }
        guard status == noErr, let name else { return nil }
        return name.takeUnretainedValue() as String
    }

    private static func objectUID(for deviceID: CMIODeviceID) -> String? {
        var address = propertyAddress(
            for: CMIOObjectPropertySelector(kCMIODevicePropertyDeviceUID)
        )
        var dataSize = UInt32(MemoryLayout<CFString?>.size)
        var uid: Unmanaged<CFString>?
        let status = withUnsafeMutablePointer(to: &uid) {
            CMIOObjectGetPropertyData(
                deviceID,
                &address,
                0,
                nil,
                dataSize,
                &dataSize,
                $0
            )
        }
        guard status == noErr, let uid else { return nil }
        return uid.takeUnretainedValue() as String
    }

    private static func propertyAddress(
        for selector: CMIOObjectPropertySelector
    ) -> CMIOObjectPropertyAddress {
        // Global scope + main element is the standard address for device-level properties
        CMIOObjectPropertyAddress(
            mSelector: selector,
            mScope: CMIOObjectPropertyScope(kCMIOObjectPropertyScopeGlobal),
            mElement: CMIOObjectPropertyElement(kCMIOObjectPropertyElementMain)
        )
    }
}
