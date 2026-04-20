//
//  VirtualCameraSinkClient.swift
//  Nodox
//
//  Created by Codex on 20.04.26.
//

import AVFoundation
import CoreMedia
import CoreMediaIO
import Foundation
import OSLog

final class VirtualCameraSinkClient {
    private static let maxConnectionAttempts = 8
    private static let retryDelayNanoseconds: UInt64 = 500_000_000
    private static let subsystem =
        Bundle.main.bundleIdentifier ?? "com.buildergroup.nodox"
    private static let logger = Logger(
        subsystem: subsystem,
        category: "VirtualCameraSink"
    )

    enum EnqueueResult {
        case enqueued
        case droppedWaitingForConsumer
    }

    enum SinkError: LocalizedError {
        case captureDeviceNotFound(requested: String, discovered: [String])
        case cmioDeviceNotFound(requestedUID: String, discovered: [String])
        case sinkStreamNotFound(requested: String, discovered: [String])
        case bufferQueueCopyFailed(OSStatus)
        case startStreamFailed(OSStatus)
        case enqueueFailed(OSStatus)

        var errorDescription: String? {
            switch self {
            case .captureDeviceNotFound(let deviceName, let discoveredDevices):
                let discoveredSummary =
                    discoveredDevices.isEmpty
                    ? "No AVFoundation cameras were visible to NoDox yet."
                    : "Visible AVFoundation cameras: \(discoveredDevices.joined(separator: ", "))."
                return
                    "The \(deviceName) device is not available yet. \(discoveredSummary)"
            case .cmioDeviceNotFound(let deviceUID, let discoveredUIDs):
                let discoveredSummary =
                    discoveredUIDs.isEmpty
                    ? "No CMIO device UIDs were visible to NoDox yet."
                    : "Visible CMIO device UIDs: \(discoveredUIDs.joined(separator: ", "))."
                return
                    "NoDox found its AVFoundation camera, but could not map it back to CoreMediaIO device UID \(deviceUID). \(discoveredSummary)"
            case .sinkStreamNotFound(let streamName, let discoveredStreams):
                let discoveredSummary =
                    discoveredStreams.isEmpty
                    ? "No streams were visible on the NoDox camera."
                    : "Visible streams: \(discoveredStreams.joined(separator: ", "))."
                return
                    "The \(streamName) input stream was not found on the NoDox camera. \(discoveredSummary)"
            case .bufferQueueCopyFailed(let status):
                return
                    "NoDox could not open the camera input queue (\(status))."
            case .startStreamFailed(let status):
                return
                    "NoDox could not start the camera input stream (\(status))."
            case .enqueueFailed(let status):
                return
                    "NoDox failed to enqueue a frame for the virtual camera (\(status))."
            }
        }
    }

    private let stateQueue = DispatchQueue(
        label: "com.buildergroup.nodox.virtual-camera-sink"
    )

    private var sinkDeviceID: CMIODeviceID = 0
    private var sinkStreamID: CMIOStreamID = 0
    private var sinkQueue: CMSimpleQueue?
    private var readyToEnqueue = false

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

    func connectIfNeeded() throws {
        try stateQueue.sync {
            try connectWithRetryLocked()
        }
    }

    func enqueue(_ sampleBuffer: CMSampleBuffer) throws -> EnqueueResult {
        try stateQueue.sync {
            try connectWithRetryLocked()

            guard readyToEnqueue, let sinkQueue else {
                return .droppedWaitingForConsumer
            }

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

    private func connectWithRetryLocked() throws {
        guard sinkQueue == nil else {
            return
        }

        try Self.enableVirtualCameraDiscovery()

        var lastError: Error?

        for attempt in 1...Self.maxConnectionAttempts {
            do {
                try connectIfNeededLocked()
                return
            } catch let error as SinkError {
                lastError = error

                switch error {
                case .captureDeviceNotFound, .cmioDeviceNotFound,
                    .sinkStreamNotFound:
                    Self.logger.info(
                        "NoDox sink discovery attempt \(attempt) is still waiting for the virtual camera to appear"
                    )

                    if attempt < Self.maxConnectionAttempts {
                        Thread.sleep(
                            forTimeInterval: Double(Self.retryDelayNanoseconds)
                                / Double(NSEC_PER_SEC)
                        )
                        continue
                    }
                default:
                    throw error
                }
            }
        }

        throw lastError
            ?? SinkError.captureDeviceNotFound(
                requested: AppConfig.virtualCameraDeviceName,
                discovered: []
            )
    }

    private func connectIfNeededLocked() throws {
        let captureDevice = try Self.findCaptureDevice(
            named: AppConfig.virtualCameraDeviceName
        )
        Self.logger.info(
            "Resolved AVFoundation camera \(captureDevice.localizedName, privacy: .public) with uniqueID \(captureDevice.uniqueID, privacy: .public)"
        )
        let deviceID = try Self.findCMIODevice(uid: captureDevice.uniqueID)
        Self.logger.info(
            "Mapped AVFoundation uniqueID \(captureDevice.uniqueID, privacy: .public) to CMIO device \(deviceID)"
        )
        let streamID = try Self.findStream(
            named: AppConfig.virtualCameraSinkStreamName,
            on: deviceID
        )
        Self.logger.info(
            "Resolved NoDox sink stream \(streamID) on CMIO device \(deviceID)"
        )

        let refCon = Unmanaged.passUnretained(self).toOpaque()
        var queue: Unmanaged<CMSimpleQueue>?

        let bufferQueueStatus = CMIOStreamCopyBufferQueue(
            streamID,
            { _, _, refCon in
                guard let refCon else {
                    return
                }

                let sinkClient = Unmanaged<VirtualCameraSinkClient>.fromOpaque(
                    refCon
                ).takeUnretainedValue()
                sinkClient.markReadyToEnqueue()
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
        stateQueue.async {
            self.readyToEnqueue = true
        }
    }

    private static func findCaptureDevice(named name: String) throws
        -> AVCaptureDevice
    {
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.externalUnknown],
            mediaType: .video,
            position: .unspecified
        )

        let devices = discoverySession.devices
        let discoveredNameSummary = devices.map(\.localizedName).joined(
            separator: ", "
        )
        Self.logger.info(
            "AVFoundation externalUnknown discovery found \(devices.count) camera(s): \(discoveredNameSummary, privacy: .public)"
        )

        if let device = devices.first(where: { $0.localizedName == name }) {
            return device
        }

        let discoveredNames = Array(Set(devices.map(\.localizedName))).sorted()

        throw SinkError.captureDeviceNotFound(
            requested: name,
            discovered: discoveredNames
        )
    }

    private static func findCMIODevice(uid: String) throws -> CMIODeviceID {
        var devicesAddress = propertyAddress(
            for: CMIOObjectPropertySelector(kCMIOHardwarePropertyDevices)
        )
        var dataSize: UInt32 = 0

        let dataSizeStatus = CMIOObjectGetPropertyDataSize(
            CMIOObjectID(kCMIOObjectSystemObject),
            &devicesAddress,
            0,
            nil,
            &dataSize
        )

        guard dataSizeStatus == noErr else {
            throw SinkError.cmioDeviceNotFound(
                requestedUID: uid,
                discovered: []
            )
        }

        let deviceCount = Int(dataSize) / MemoryLayout<CMIODeviceID>.size
        var deviceIDs = [CMIODeviceID](repeating: 0, count: deviceCount)

        let devicesStatus = CMIOObjectGetPropertyData(
            CMIOObjectID(kCMIOObjectSystemObject),
            &devicesAddress,
            0,
            nil,
            dataSize,
            &dataSize,
            &deviceIDs
        )

        guard devicesStatus == noErr else {
            throw SinkError.cmioDeviceNotFound(
                requestedUID: uid,
                discovered: []
            )
        }

        var discoveredUIDs: [String] = []
        for deviceID in deviceIDs {
            let deviceUID = try objectUID(for: deviceID)
            discoveredUIDs.append(deviceUID)

            if deviceUID == uid {
                return deviceID
            }
        }

        let discoveredUIDSummary = discoveredUIDs.joined(separator: ", ")
        Self.logger.info(
            "Visible CMIO device UIDs: \(discoveredUIDSummary, privacy: .public)"
        )

        throw SinkError.cmioDeviceNotFound(
            requestedUID: uid,
            discovered: discoveredUIDs
        )
    }

    private static func findStream(
        named name: String,
        on deviceID: CMIODeviceID
    ) throws -> CMIOStreamID {
        var streamsAddress = propertyAddress(
            for: CMIOObjectPropertySelector(kCMIODevicePropertyStreams)
        )
        var dataSize: UInt32 = 0

        let dataSizeStatus = CMIOObjectGetPropertyDataSize(
            deviceID,
            &streamsAddress,
            0,
            nil,
            &dataSize
        )
        guard dataSizeStatus == noErr else {
            throw SinkError.sinkStreamNotFound(requested: name, discovered: [])
        }

        let streamCount = Int(dataSize) / MemoryLayout<CMIOStreamID>.size
        var streamIDs = [CMIOStreamID](repeating: 0, count: streamCount)

        let streamsStatus = CMIOObjectGetPropertyData(
            deviceID,
            &streamsAddress,
            0,
            nil,
            dataSize,
            &dataSize,
            &streamIDs
        )

        guard streamsStatus == noErr else {
            throw SinkError.sinkStreamNotFound(requested: name, discovered: [])
        }

        var discoveredStreamNames: [String] = []
        for streamID in streamIDs {
            let streamName = try objectName(for: streamID)
            discoveredStreamNames.append(streamName)

            if streamName == name {
                return streamID
            }
        }

        let discoveredStreamSummary = discoveredStreamNames.joined(
            separator: ", "
        )
        Self.logger.info(
            "Visible CMIO stream names on device \(deviceID): \(discoveredStreamSummary, privacy: .public)"
        )

        throw SinkError.sinkStreamNotFound(
            requested: name,
            discovered: discoveredStreamNames
        )
    }

    private static func objectName(for objectID: CMIOObjectID) throws -> String
    {
        var nameAddress = propertyAddress(
            for: CMIOObjectPropertySelector(kCMIOObjectPropertyName)
        )
        var dataSize = UInt32(MemoryLayout<CFString?>.size)
        var name: Unmanaged<CFString>?

        let status = withUnsafeMutablePointer(to: &name) { namePointer in
            CMIOObjectGetPropertyData(
                objectID,
                &nameAddress,
                0,
                nil,
                dataSize,
                &dataSize,
                namePointer
            )
        }

        guard status == noErr, let name else {
            throw SinkError.captureDeviceNotFound(
                requested: AppConfig.virtualCameraDeviceName,
                discovered: []
            )
        }

        return name.takeUnretainedValue() as String
    }

    private static func objectUID(for deviceID: CMIODeviceID) throws -> String {
        var uidAddress = propertyAddress(
            for: CMIOObjectPropertySelector(kCMIODevicePropertyDeviceUID)
        )
        var dataSize = UInt32(MemoryLayout<CFString?>.size)
        var uid: Unmanaged<CFString>?

        let status = withUnsafeMutablePointer(to: &uid) { uidPointer in
            CMIOObjectGetPropertyData(
                deviceID,
                &uidAddress,
                0,
                nil,
                dataSize,
                &dataSize,
                uidPointer
            )
        }

        guard status == noErr, let uid else {
            throw SinkError.cmioDeviceNotFound(
                requestedUID: "unknown",
                discovered: []
            )
        }

        return uid.takeUnretainedValue() as String
    }

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
            throw SinkError.captureDeviceNotFound(
                requested: AppConfig.virtualCameraDeviceName,
                discovered: []
            )
        }
    }

    private static func propertyAddress(
        for selector: CMIOObjectPropertySelector
    ) -> CMIOObjectPropertyAddress {
        CMIOObjectPropertyAddress(
            mSelector: selector,
            mScope: CMIOObjectPropertyScope(kCMIOObjectPropertyScopeGlobal),
            mElement: CMIOObjectPropertyElement(kCMIOObjectPropertyElementMain)
        )
    }
}
