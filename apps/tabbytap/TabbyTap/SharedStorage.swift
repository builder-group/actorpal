//
//  SharedStorage.swift
//  TabbyTap
//
//  Created by Benno on 26.11.25.
//

import Combine
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

    // MARK: - Debug View

    var showDebugView: Bool {
        get {
            return defaults?.bool(forKey: "showDebugView") ?? false
        }
        set {
            defaults?.set(newValue, forKey: "showDebugView")
            NotificationCenter.default.post(
                name: NSNotification.Name("DebugViewChanged"), object: nil)
        }
    }
}

// MARK: - Storage Observer

class StorageObserver: ObservableObject {
    @Published var tapCount: Int = SharedStorage.shared.tapCount
    @Published var catPosition: CatPosition = SharedStorage.shared.catPosition
    @Published var showDebugView: Bool = SharedStorage.shared.showDebugView

    private var timer: Timer?
    private let storage = SharedStorage.shared

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] _ in
            guard let self = self else { return }

            let currentTapCount = self.storage.tapCount
            if currentTapCount != self.tapCount {
                self.tapCount = currentTapCount
            }

            let currentPosition = self.storage.catPosition
            if currentPosition != self.catPosition {
                self.catPosition = currentPosition
            }

            let currentDebugView = self.storage.showDebugView
            if currentDebugView != self.showDebugView {
                self.showDebugView = currentDebugView
            }
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
    }

    deinit {
        stop()
    }
}
