//
//  SingletonModel.swift
//  Derive
//

import Foundation
import SwiftData

/// Protocol for singleton SwiftData models that have a default instance.
protocol SingletonModel: PersistentModel {
    /// Default instance used when creating new singleton instances.
    static var `default`: Self { get }

    /// Fetches existing instance or creates one from `default` if not found.
    static func instance(with modelContext: ModelContext) -> Self
}

extension SingletonModel {
    static func instance(with modelContext: ModelContext) -> Self {
        let descriptor = FetchDescriptor<Self>()
        if let result = try? modelContext.fetch(descriptor).first {
            return result
        } else {
            let instance = Self.default
            modelContext.insert(instance)
            try? modelContext.save()
            return instance
        }
    }
}
