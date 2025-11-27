//
//  ContentView.swift
//  TabbyTap
//
//  Created by Benno on 26.11.25.
//

import SwiftUI

struct ContentView: View {
    @State private var tapCount: Int = SharedStorage.shared.tapCount
    @State private var catPosition: CatPosition = SharedStorage.shared.catPosition
    @State private var testText: String = ""
    private let storage = SharedStorage.shared

    var body: some View {
        VStack(spacing: 30) {
            // Tap Count Display
            VStack(spacing: 10) {
                Text("Total Taps")
                    .font(.headline)
                    .foregroundColor(.secondary)
                Text("\(tapCount)")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(.primary)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(12)

            // Test Text Field
            VStack(alignment: .leading, spacing: 10) {
                Text("Test Keyboard")
                    .font(.headline)
                    .foregroundColor(.secondary)
                TextField("Type here to test keyboard...", text: $testText)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal, 4)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(12)

            // Cat Position Selector
            VStack(alignment: .leading, spacing: 15) {
                Text("Cat Position")
                    .font(.headline)
                    .foregroundColor(.secondary)

                VStack(spacing: 12) {
                    ForEach(CatPosition.allCases, id: \.self) { position in
                        Button(action: {
                            storage.catPosition = position
                            catPosition = position
                        }) {
                            Text(positionLabel(position))
                                .font(.subheadline)
                                .foregroundColor(catPosition == position ? .white : .primary)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    catPosition == position
                                        ? Color.accentColor : Color(uiColor: .systemGray6)
                                )
                                .cornerRadius(8)
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(12)

            Spacer()
        }
        .padding()
        .onAppear {
            updateTapCount()
            startTapCountObserver()
        }
        .onReceive(
            NotificationCenter.default.publisher(for: NSNotification.Name("TapCountChanged"))
        ) { _ in
            updateTapCount()
        }
        .onReceive(
            NotificationCenter.default.publisher(for: NSNotification.Name("CatPositionChanged"))
        ) { _ in
            catPosition = storage.catPosition
        }
    }

    private func positionLabel(_ position: CatPosition) -> String {
        switch position {
        case .autocompleteBar:
            return "AutoComplete Bar"
        case .spaceBar:
            return "Space Bar"
        case .enterBar:
            return "Enter Bar"
        }
    }

    private func updateTapCount() {
        tapCount = storage.tapCount
    }

    private func startTapCountObserver() {
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            let currentCount = storage.tapCount
            if currentCount != tapCount {
                tapCount = currentCount
            }
        }
    }
}

#Preview {
    ContentView()
}
