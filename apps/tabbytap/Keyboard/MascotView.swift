//
//  MascotView.swift
//  Keyboard
//
//  Created by Benno on 26.11.25.
//

import Combine
import KeyboardKit
import SwiftUI

struct MascotView: View {
    @ObservedObject var state: MascotState

    var body: some View {
        ZStack {
            // Base character image
            Image("base")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 108, height: 54)

            // Left hand
            Image(state.isLeftHandUp ? "left-up" : "left-down")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 100, height: 100)
                .offset(x: 3, y: 1)

            // Right hand
            Image(state.isLeftHandUp ? "right-down" : "right-up")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 100, height: 100)
                .offset(x: -3, y: 1)
        }
        .frame(width: 120, height: 60)
    }
}

struct MascotCounterView: View {
    let count: Int

    var body: some View {
        Text("\(count)")
            .font(.system(size: 20, weight: .bold))
            .foregroundColor(.white)
            .frame(width: 40, height: 30)
            .background(Color.black.opacity(0.6))
            .cornerRadius(10)
            .offset(x: 20, y: -15)
    }
}

struct MascotOverlayView: View {
    @ObservedObject var state: MascotState
    @StateObject private var storageObserver = StorageObserver()
    let services: Keyboard.Services

    var body: some View {
        // Cat and counter
        HStack(spacing: 15) {
            MascotCounterView(count: state.keyPressCount)
            MascotView(state: state)
        }
        .modifier(DebugModifier(isEnabled: storageObserver.showDebugView))
        .frame(
            maxWidth: .infinity, maxHeight: .infinity,
            alignment: alignmentForPosition(storageObserver.catPosition)
        )
        .padding(paddingForPosition(storageObserver.catPosition))
        .modifier(DebugFrameModifier(isEnabled: storageObserver.showDebugView))
        .allowsHitTesting(false)
        .zIndex(500)
        .onAppear {
            storageObserver.start()
        }
        .onDisappear {
            storageObserver.stop()
        }
    }

    private func paddingForPosition(_ position: CatPosition) -> EdgeInsets {
        switch position {
        case .autocompleteBar:
            return EdgeInsets(top: 5, leading: 0, bottom: 0, trailing: 20)
        case .spaceBar:
            return EdgeInsets(top: 0, leading: 0, bottom: -3, trailing: 0)
        case .enterBar:
            return EdgeInsets(top: 0, leading: 0, bottom: -3, trailing: 0)
        }
    }

    private func alignmentForPosition(_ position: CatPosition) -> Alignment {
        switch position {
        case .autocompleteBar:
            return .topTrailing
        case .spaceBar:
            return .bottom
        case .enterBar:
            return .bottomTrailing
        }
    }
}

// MARK: - Debug Modifiers

struct DebugModifier: ViewModifier {
    let isEnabled: Bool

    func body(content: Content) -> some View {
        if isEnabled {
            content
                .background(Color.red.opacity(0.3))
                .border(Color.blue, width: 2)
        } else {
            content
        }
    }
}

struct DebugFrameModifier: ViewModifier {
    let isEnabled: Bool

    func body(content: Content) -> some View {
        if isEnabled {
            content
                .background(Color.green.opacity(0.2))
                .border(Color.yellow, width: 1)
        } else {
            content
        }
    }
}

