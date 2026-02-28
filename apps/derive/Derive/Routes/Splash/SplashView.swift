//
//  SplashView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct SplashView: View {
    var body: some View {
        Image("logo")
            .resizable()
            .scaledToFit()
            .frame(width: 80, height: 80)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { Color.appBackground.ignoresSafeArea() }
    }
}

#Preview {
    SplashView()
}
