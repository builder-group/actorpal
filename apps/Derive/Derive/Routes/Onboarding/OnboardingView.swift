//
//  OnboardingView.swift
//  Derive
//

import SwiftUI

struct OnboardingView: View {
    var body: some View {
        NavigationStack {
            OnboardingWelcomeView()
        }
    }
}

#Preview {
    OnboardingView()
        .previewDataContainer()
}
