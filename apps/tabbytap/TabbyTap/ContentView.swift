//
//  ContentView.swift
//  TabbyTap
//
//  Created by Benno on 26.11.25.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var storageObserver = StorageObserver()
    @State private var testText: String = ""
    private let storage = SharedStorage.shared

    var body: some View {
        VStack(spacing: 30) {
            // Tap Count Display
            VStack(spacing: 10) {
                Text("Total Taps")
                    .font(.headline)
                    .foregroundColor(.secondary)
                Text("\(storageObserver.tapCount)")
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
                        }) {
                            Text(positionLabel(position))
                                .font(.subheadline)
                                .foregroundColor(storageObserver.catPosition == position ? .white : .primary)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    storageObserver.catPosition == position
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
            storageObserver.start()
        }
        .onDisappear {
            storageObserver.stop()
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
}

#Preview {
    ContentView()
}
