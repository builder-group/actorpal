//
//  OnboardingWelcomeView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct OnboardingWelcomeView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer().frame(height: 60)

            // Title
            Text("Dérive")
                .font(.erode(36, weight: .bold))

            Spacer().frame(height: 8)

            // Subtitle
            Text("A reason to look up from your phone")
                .font(.body)
                .foregroundStyle(.secondary)

            Spacer()

            // CTA
            NavigationLink {
                OnboardingHowItWorksView()
            } label: {
                Text("Get Started")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.appCta)
                    .foregroundStyle(Color.appCtaContent)
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 24)
        .background(Color.appBackground)
        .navigationBarHidden(true)
    }
}

#Preview {
    NavigationStack {
        OnboardingWelcomeView()
    }
}
