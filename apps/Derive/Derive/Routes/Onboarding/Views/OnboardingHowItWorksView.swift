//
//  OnboardingHowItWorksView.swift
//  Derive
//

import SwiftUI

struct OnboardingHowItWorksView: View {
    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 8) {
                        Text("How It Works")
                            .font(.largeTitle)
                            .fontWeight(.bold)

                        Text("Three simple steps to your first derive")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 20)

                    // Steps
                    VStack(spacing: 16) {
                        stepCard(
                            number: "1",
                            icon: "sparkles",
                            title: "Pick a prompt",
                            description: "Choose a creative constraint to guide your exploration",
                            color: .deriveTerracotta
                        )

                        stepCard(
                            number: "2",
                            icon: "camera",
                            title: "Wander & capture",
                            description: "Take photos during your walks to fill all 9 slots",
                            color: .deriveSage
                        )

                        stepCard(
                            number: "3",
                            icon: "square.and.arrow.up",
                            title: "Share your grid",
                            description: "Complete your derive and share it with friends",
                            color: .deriveLavender
                        )
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 100)
            }

            // CTA
            VStack {
                NavigationLink {
                    OnboardingPickChallengeView()
                } label: {
                    HStack {
                        Text("Choose Your First Prompt")
                        Image(systemName: "arrow.right")
                    }
                }
                .buttonStyle(.derivePrimary(color: .deriveSage))
            }
            .padding()
            .background(
                Color.deriveBackground
                    .shadow(color: .black.opacity(0.05), radius: 10, y: -5)
                    .ignoresSafeArea()
            )
        }
        .background(Color.deriveBackground.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func stepCard(
        number: String,
        icon: String,
        title: String,
        description: String,
        color: Color
    ) -> some View {
        HStack(spacing: 16) {
            // Number badge
            ZStack {
                Circle()
                    .fill(color.opacity(0.2))
                    .frame(width: 50, height: 50)

                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(color)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)

                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(16)
        .deriveCard()
    }
}

#Preview {
    NavigationStack {
        OnboardingHowItWorksView()
    }
}
