//
//  OnboardingHowItWorksView.swift
//  Derive
//

import SwiftUI

struct OnboardingHowItWorksView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("How it works")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.horizontal)

            Text("Three simple steps")
                .foregroundStyle(.secondary)
                .padding(.horizontal)
                .padding(.top, 8)

            Spacer()
                .frame(height: 32)

            VStack(spacing: 24) {
                stepRow(number: 1, title: "Pick a color", description: "Choose from yellow, red, blue, and more")
                stepRow(number: 2, title: "Find 9 things", description: "Look around and photograph what you find")
                stepRow(number: 3, title: "Share your grid", description: "Save or share your completed derive")
            }
            .padding(.horizontal)

            Spacer()

            NavigationLink {
                OnboardingPickChallengeView()
            } label: {
                Text("Choose a Color")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func stepRow(number: Int, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            Text("\(number)")
                .font(.headline)
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(Circle().fill(Color.accentColor))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)

                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
    }
}

#Preview {
    NavigationStack {
        OnboardingHowItWorksView()
    }
}
