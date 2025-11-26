//
//  KeyboardViewController.swift
//  Keyboard
//
//  Created by Benno on 26.11.25.
//

import KeyboardKit
import SwiftUI

class KeyboardViewController: KeyboardInputViewController {

    private let mascotState = MascotState()

    override func viewDidLoad() {
        super.viewDidLoad()
        setup(for: .keyboardKitApp) { _ in }
    }

    override func viewWillSetupKeyboardView() {
        setupKeyboardView { [weak self] controller in
            guard let self = self else {
                return AnyView(Self.makeKeyboardView(services: controller.services))
            }

            return AnyView(
                ZStack(alignment: .topTrailing) {
                    Self.makeKeyboardView(services: controller.services)
                    MascotOverlayView(state: self.mascotState)
                }
            )
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        // Start tracking text changes
        mascotState.startTracking { [weak self] in
            self?.getCurrentTextLength() ?? 0
        }
    }

    private func getCurrentTextLength() -> Int {
        let before = textDocumentProxy.documentContextBeforeInput?.count ?? 0
        let after = textDocumentProxy.documentContextAfterInput?.count ?? 0
        return before + after
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        mascotState.stopTracking()
    }

    private static func makeKeyboardView(services: Keyboard.Services) -> some View {
        KeyboardView(
            services: services,
            buttonContent: { $0.view },
            buttonView: { $0.view },
            collapsedView: { $0.view },
            emojiKeyboard: { $0.view },
            toolbar: { $0.view }
        )
    }
}
