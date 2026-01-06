//
//  PhotoSlot.swift
//  Derive
//

import Foundation

/// A single slot in the 3×3 photo grid.
/// Stored as Codable array in Derive model.
struct PhotoSlot: Codable, Identifiable {
    let id: UUID
    var imageData: Data?
    var capturedAt: Date?

    init(id: UUID = UUID(), imageData: Data? = nil, capturedAt: Date? = nil) {
        self.id = id
        self.imageData = imageData
        self.capturedAt = capturedAt
    }

    var isEmpty: Bool {
        imageData == nil
    }

    var isFilled: Bool {
        imageData != nil
    }
}
