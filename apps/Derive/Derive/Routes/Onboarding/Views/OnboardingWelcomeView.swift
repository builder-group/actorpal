//
//  OnboardingWelcomeView.swift
//  Derive
//

import SwiftUI

struct OnboardingWelcomeView: View {
    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Illustration
            ZStack {
                Circle()
                    .fill(Color.deriveSand)
                    .frame(width: 200, height: 200)

                Image(systemName: "square.grid.3x3.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(Color.deriveTerracotta)
            }
            .padding(.bottom, 40)

            // Content
            VStack(spacing: 16) {
                Text("Welcome to Derive")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text(
                    "A playful photo ritual for curious wanderers. Pick a creative prompt, explore your surroundings, and fill a 3×3 grid with what you discover."
                )
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            }

            Spacer()

            // CTA
            NavigationLink {
                OnboardingHowItWorksView()
            } label: {
                HStack {
                    Text("Begin")
                    Image(systemName: "arrow.right")
                }
            }
            .buttonStyle(.derivePrimary(color: .deriveTerracotta))
            .padding(.horizontal)
            .padding(.bottom)
        }
        .background(Color.deriveBackground.ignoresSafeArea())
        .navigationBarHidden(true)
    }
}

#Preview {
    NavigationStack {
        OnboardingWelcomeView()
    }
}
