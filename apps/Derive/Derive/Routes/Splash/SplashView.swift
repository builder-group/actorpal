//
//  SplashView.swift
//  Derive
//

import SwiftUI

struct SplashView: View {
    var body: some View {
        Image("logo")
            .resizable()
            .scaledToFit()
            .frame(width: 80, height: 80)
    }
}

#Preview {
    SplashView()
}
