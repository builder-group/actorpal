//
//  OnboardingWelcomeView.swift
//  Derive
//

import SwiftUI

struct OnboardingWelcomeView: View {
    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            gridIllustration

            Spacer()
                .frame(height: 48)

            VStack(spacing: 12) {
                Text("Derive")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("A photo ritual for curious wanderers")
                    .foregroundStyle(.secondary)
            }

            Spacer()
                .frame(height: 24)

            Text("Pick a color, find 9 things in that color,\nand fill your grid.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Spacer()

            NavigationLink {
                OnboardingHowItWorksView()
            } label: {
                Text("Get Started")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding()
        }
        .navigationBarHidden(true)
    }

    private var gridIllustration: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3),
            spacing: 4
        ) {
            ForEach(0 ..< 9, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(.tertiarySystemFill))
                    .aspectRatio(1, contentMode: .fit)
            }
        }
        .frame(width: 200)
    }
}

#Preview {
    NavigationStack {
        OnboardingWelcomeView()
    }
}
