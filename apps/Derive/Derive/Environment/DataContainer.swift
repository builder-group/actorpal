//
//  DataContainer.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import Foundation
import OSLog
import SwiftData
import SwiftUI

@Observable
@MainActor
class DataContainer {
    static let shared = DataContainer()

    let modelContainer: ModelContainer

    var modelContext: ModelContext {
        modelContainer.mainContext
    }

    init(isStoredInMemoryOnly: Bool = false) {
        do {
            modelContainer = try Self.createContainer(
                isStoredInMemoryOnly: isStoredInMemoryOnly
            )
        } catch {
            guard !isStoredInMemoryOnly else {
                fatalError("Failed to create in-memory container: \(error)")
            }
            Logger(
                subsystem: AppConfig.bundleIdentifier,
                category: "DataContainer"
            ).error(
                "Failed to create persistent container, using in-memory: \(error.localizedDescription)"
            )
            modelContainer = try! Self.createContainer(
                isStoredInMemoryOnly: true
            )
        }

        DataContainer.ensureDefaults(in: modelContext)
    }

    private static func createContainer(
        isStoredInMemoryOnly: Bool
    ) throws -> ModelContainer {
        let schema = Schema(Self.schema())
        let configuration = ModelConfiguration(
            "DeriveData",
            schema: schema,
            isStoredInMemoryOnly: isStoredInMemoryOnly,
            allowsSave: true,
            cloudKitDatabase: .none
        )
        return try ModelContainer(for: schema, configurations: [configuration])
    }

    static func schema() -> [any PersistentModel.Type] {
        [
            Player.self,
            Derive.self,
        ]
    }

    static func ensureDefaults(in context: ModelContext) {
        _ = Player.instance(with: context)
        try? context.save()
    }
}

// MARK: - Preview Support

extension View {
    func previewDataContainer(seed: ((ModelContext) -> Void)? = nil) -> some View {
        let container = DataContainer(isStoredInMemoryOnly: true)
        if let seed = seed {
            seed(container.modelContext)
            try? container.modelContext.save()
        }
        return self.modelContainer(container.modelContainer)
    }
}
