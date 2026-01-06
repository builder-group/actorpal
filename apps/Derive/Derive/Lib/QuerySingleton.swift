//
//  QuerySingleton.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftData
import SwiftUI

/// Property wrapper for querying singleton SwiftData models.
/// Returns the first instance from the store, or falls back to `Model.default` if not found.
///
/// ```swift
/// @QuerySingleton private var player: Player
/// ```
@propertyWrapper
struct QuerySingleton<Model: SingletonModel>: DynamicProperty {
    @Query private var queried: [Model]

    var wrappedValue: Model {
        queried.first ?? Model.default
    }

    init() {
        _queried = Query()
    }
}
