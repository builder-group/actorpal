//
//  SplashView.swift
//  Derive
//

import SwiftUI

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.deriveBackground
                .ignoresSafeArea()

            Image("logo")
                .resizable()
                .scaledToFit()
                .frame(width: 120, height: 120)
        }
    }
}

#Preview {
    SplashView()
}
