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
                    KeyboardViewWithStorage(services: controller.services)
                    MascotOverlayView(state: self.mascotState, services: controller.services)
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

struct KeyboardViewWithStorage: View {
    let services: Keyboard.Services
    @StateObject private var storageObserver = StorageObserver()

    var body: some View {
        KeyboardView(
            services: services,
            buttonContent: { $0.view },
            buttonView: { button in
                AnyView(
                    Group {
                        let shouldReplace = (button.item.action == KeyboardAction.space && storageObserver.catPosition == .spaceBar) ||
                                           (button.item.action.isPrimaryAction && storageObserver.catPosition == .enterBar)
                        if shouldReplace {
                            ZStack {
                                // Hit area (invisible button that handles taps)
                                button.view
                                    .opacity(storageObserver.showDebugView ? 0.5 : 0.01)
                                // Dashed outline (visual indicator)
                                GeometryReader { geometry in
                                    Rectangle()
                                        .fill(storageObserver.showDebugView ? Color.blue.opacity(0.2) : Color.clear)
                                        .overlay(
                                            Rectangle()
                                                .stroke(style: StrokeStyle(lineWidth: 2, dash: [5, 5]))
                                                .foregroundColor(.gray.opacity(0.6))
                                        )
                                        .padding(8)
                                        .allowsHitTesting(false)
                                }
                            }
                        } else {
                            button.view
                        }
                    }
                )
            },
            collapsedView: { $0.view },
            emojiKeyboard: { $0.view },
            toolbar: { $0.view }
        )
        .onAppear {
            storageObserver.start()
        }
        .onDisappear {
            storageObserver.stop()
        }
    }
}
