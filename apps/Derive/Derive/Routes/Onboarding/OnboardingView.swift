//
//  OnboardingView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
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
