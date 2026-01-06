//
//  Color+Derive.swift
//  Derive
//

import SwiftUI

extension Color {
    // MARK: - Base Colors

    /// Warm cream background: #F3EFEA
    static let deriveBackground = Color("colors/background")

    // MARK: - Playful Palette

    /// Soft sage green for accents
    static let deriveSage = Color(red: 0.67, green: 0.76, blue: 0.68) // #ABC4AE

    /// Warm terracotta for highlights
    static let deriveTerracotta = Color(red: 0.87, green: 0.60, blue: 0.52) // #DE9985

    /// Soft lavender for variety
    static let deriveLavender = Color(red: 0.78, green: 0.75, blue: 0.87) // #C8BFDE

    /// Warm sand for subtle accents
    static let deriveSand = Color(red: 0.91, green: 0.87, blue: 0.80) // #E8DECC

    /// Muted coral
    static let deriveCoral = Color(red: 0.94, green: 0.73, blue: 0.68) // #F0BAAE

    /// Deep forest for text
    static let deriveForest = Color(red: 0.20, green: 0.26, blue: 0.22) // #334238
}

// MARK: - View Extensions

extension View {
    /// Apply card styling with rounded corners and subtle shadow
    func deriveCard(cornerRadius: CGFloat = 20) -> some View {
        self
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 4)
    }

    /// Soft card with no shadow
    func deriveSoftCard(color: Color = Color(.systemBackground), cornerRadius: CGFloat = 20) -> some View {
        self
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}

// MARK: - Button Styles

struct DerivePrimaryButtonStyle: ButtonStyle {
    var color: Color = .accentColor

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(color)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct DeriveSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(Color.primary)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(
                Capsule()
                    .fill(Color(.systemGray6))
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == DerivePrimaryButtonStyle {
    static var derivePrimary: DerivePrimaryButtonStyle { DerivePrimaryButtonStyle() }

    static func derivePrimary(color: Color) -> DerivePrimaryButtonStyle {
        DerivePrimaryButtonStyle(color: color)
    }
}

extension ButtonStyle where Self == DeriveSecondaryButtonStyle {
    static var deriveSecondary: DeriveSecondaryButtonStyle { DeriveSecondaryButtonStyle() }
}
