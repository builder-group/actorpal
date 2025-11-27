//
//  ContentView.swift
//  TabbyTap
//
//  Created by Benno on 26.11.25.
//

import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var storageObserver = StorageObserver()
    @State private var testText: String = ""
    @State private var isKeyboardEnabled: Bool = false
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

            // Playground Text Field
            VStack(alignment: .leading, spacing: 10) {
                Text("Playground")
                    .font(.headline)
                    .foregroundColor(.secondary)
                TextField("Type here to play...", text: $testText)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal, 4)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(12)
            
            // Keyboard Status
            Button(action: openKeyboardSettings) {
                HStack(spacing: 12) {
                    Image(systemName: isKeyboardEnabled ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundColor(isKeyboardEnabled ? .green : .red)
                        .font(.title2)
                    Text(isKeyboardEnabled ? "Keyboard Enabled" : "Keyboard Not Enabled")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                        .font(.subheadline)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(uiColor: .systemGray6))
                .cornerRadius(12)
            }
            .buttonStyle(PlainButtonStyle())

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

            // Debug Toggle
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Debug View")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    Spacer()
                    Toggle("", isOn: Binding(
                        get: { storageObserver.showDebugView },
                        set: { storage.showDebugView = $0 }
                    ))
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
            checkKeyboardStatus()
        }
        .onDisappear {
            storageObserver.stop()
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
            checkKeyboardStatus()
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            checkKeyboardStatus()
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
    
    private func openKeyboardSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
    
    private func checkKeyboardStatus() {
        let keyboardBundleId = "com.buildergroup.TabbyTap.Keyboard"
        
        // Get all active input modes
        let activeInputModes = UITextInputMode.activeInputModes
        
        // Check if our keyboard extension is in the list
        isKeyboardEnabled = activeInputModes.contains { inputMode in
            if let identifier = inputMode.value(forKey: "identifier") as? String {
                return identifier.contains(keyboardBundleId) || identifier == keyboardBundleId
            }
            return false
        }
    }
}

#Preview {
    ContentView()
}
