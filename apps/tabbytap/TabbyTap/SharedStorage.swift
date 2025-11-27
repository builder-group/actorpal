//
//  SharedStorage.swift
//  TabbyTap
//
//  Created by Benno on 26.11.25.
//

import Foundation

enum CatPosition: String, CaseIterable {
    case autocompleteBar = "autocompleteBar"
    case spaceBar = "spaceBar"
    case enterBar = "enterBar"
}

class SharedStorage {
    static let shared = SharedStorage()

    private let appGroupId = "group.com.buildergroup.tabbytab"
    private var defaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupId)
    }

    private init() {}

    // MARK: - Tap Count

    var tapCount: Int {
        get {
            return defaults?.integer(forKey: "tapCount") ?? 0
        }
        set {
            defaults?.set(newValue, forKey: "tapCount")
            NotificationCenter.default.post(
                name: NSNotification.Name("TapCountChanged"), object: nil)
        }
    }

    func incrementTapCount() {
        tapCount += 1
    }

    // MARK: - Cat Position

    var catPosition: CatPosition {
        get {
            guard let rawValue = defaults?.string(forKey: "catPosition"),
                let position = CatPosition(rawValue: rawValue)
            else {
                return .autocompleteBar
            }
            return position
        }
        set {
            defaults?.set(newValue.rawValue, forKey: "catPosition")
            NotificationCenter.default.post(
                name: NSNotification.Name("CatPositionChanged"), object: nil)
        }
    }
}
