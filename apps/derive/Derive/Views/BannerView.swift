//
//  BannerView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct BannerView: View {
    let icon: String
    let message: Text
    let style: Style

    init(icon: String, message: String, style: Style) {
        self.icon = icon
        self.message = Text(message)
        self.style = style
    }

    init(icon: String, message: Text, style: Style) {
        self.icon = icon
        self.message = message
        self.style = style
    }

    enum Style {
        case success
        case warning
        case info
        case error

        var color: Color {
            switch self {
            case .success: return .green
            case .warning: return .yellow
            case .info: return .blue
            case .error: return .red
            }
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.callout)
                .foregroundStyle(style.color)

            message
                .font(.footnote)
                .foregroundStyle(.primary)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(style.color.opacity(0.12))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(style.color.opacity(0.3), lineWidth: 1)
        )
    }
}

#Preview {
    VStack(spacing: 12) {
        BannerView(
            icon: "checkmark.circle.fill",
            message: "Operation completed successfully.",
            style: .success
        )

        BannerView(
            icon: "exclamationmark.triangle.fill",
            message: "Complete your current dérive to start a new one.",
            style: .warning
        )

        BannerView(
            icon: "info.circle.fill",
            message: "This is helpful information.",
            style: .info
        )

        BannerView(
            icon: "xmark.circle.fill",
            message: "An error occurred.",
            style: .error
        )
    }
    .padding()
    .background(Color.appBackground)
}
