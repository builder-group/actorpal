//
//  MascotState.swift
//  Keyboard
//
//  Created by Benno on 26.11.25.
//

import Combine
import Foundation

class MascotState: ObservableObject {
    @Published var keyPressCount: Int = 0
    @Published var isLeftHandUp: Bool = false

    private var lastTextLength: Int = 0
    private var pollingTimer: Timer?
    private let storage = SharedStorage.shared

    init() {
        keyPressCount = storage.tapCount
    }

    func startTracking(textLengthProvider: @escaping () -> Int) {
        lastTextLength = textLengthProvider()

        pollingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self else { return }

            let currentLength = textLengthProvider()
            if currentLength != self.lastTextLength {
                self.lastTextLength = currentLength
                self.handleKeyPress()
            }
        }
    }

    func stopTracking() {
        pollingTimer?.invalidate()
        pollingTimer = nil
    }

    private func handleKeyPress() {
        storage.incrementTapCount()
        keyPressCount = storage.tapCount
        isLeftHandUp.toggle()
    }

    deinit {
        stopTracking()
    }
}
