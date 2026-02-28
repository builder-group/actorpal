//
//  AboutLogoView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct AboutLogoView: View {
    var body: some View {
        Image("logo")
            .font(.system(size: 48))
            .foregroundStyle(.primary)
    }
}

#Preview {
    AboutLogoView()
        .padding()
        .background(Color.appBackground)
}
