//
//  OnboardingHowItWorksView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct OnboardingHowItWorksView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Title
            Text("How it works")
                .font(.erode(36, weight: .bold))

            Spacer().frame(height: 8)

            // Subtitle
            Text("Three simple steps")
                .font(.body)
                .foregroundStyle(.secondary)

            Spacer().frame(height: 40)

            // Content
            VStack(spacing: 24) {
                stepRow(number: 1, title: "Pick a color", description: "Choose from yellow, red, blue, and more")
                stepRow(number: 2, title: "Find 9 things", description: "Look around and photograph what you find")
                stepRow(number: 3, title: "Complete your grid", description: "Save or share your finished dérive")
            }

            Spacer()

            // CTA
            NavigationLink {
                OnboardingPickChallengeView()
            } label: {
                Text("Choose a Color")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.appCta)
                    .foregroundStyle(Color.appCtaContent)
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 60)
        .padding(.bottom, 24)
        .background(Color.appBackground)
        .navigationBarHidden(true)
    }

    private func stepRow(number: Int, title: String, description: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            Text("\(number)")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.appCtaContent)
                .frame(width: 28, height: 28)
                .background(Circle().fill(Color.appCta))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))

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
