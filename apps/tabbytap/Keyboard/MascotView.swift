//
//  MascotView.swift
//  Keyboard
//
//  Created by Benno on 26.11.25.
//

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
    @State private var catPosition: CatPosition = SharedStorage.shared.catPosition

    var body: some View {
        HStack(spacing: 15) {
            MascotCounterView(count: state.keyPressCount)
            MascotView(state: state)
        }
        .frame(
            maxWidth: .infinity, maxHeight: .infinity, alignment: alignmentForPosition(catPosition)
        )
        .padding(paddingForPosition(catPosition))
        .allowsHitTesting(false)
        .zIndex(1000)
        .onReceive(
            NotificationCenter.default.publisher(for: NSNotification.Name("CatPositionChanged"))
        ) { _ in
            catPosition = SharedStorage.shared.catPosition
        }
    }

    private func paddingForPosition(_ position: CatPosition) -> EdgeInsets {
        switch position {
        case .autocompleteBar:
            return EdgeInsets(top: 5, leading: 0, bottom: 0, trailing: 10)
        case .spaceBar:
            return EdgeInsets(top: 0, leading: 0, bottom: 5, trailing: 0)
        case .enterBar:
            return EdgeInsets(top: 0, leading: 0, bottom: 5, trailing: 10)
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
