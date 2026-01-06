//
//  ChallengeImageView.swift
//  Derive
//

import SwiftUI

/// Displays a challenge's image or a fallback colored circle/icon.
struct ChallengeImageView: View {
    let challenge: Challenge
    var size: CGFloat = 60

    var body: some View {
        Group {
            if let uiImage = UIImage(named: challenge.imageName) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
            } else {
                fallbackView
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.2, style: .continuous))
    }

    // MARK: - UI

    private var fallbackView: some View {
        RoundedRectangle(cornerRadius: size * 0.2, style: .continuous)
            .fill(challenge.color?.opacity(0.2) ?? Color(.systemGray5))
            .overlay {
                if let color = challenge.color {
                    Circle()
                        .fill(color)
                        .frame(width: size * 0.4)
                } else {
                    Image(systemName: "camera.fill")
                        .font(.system(size: size * 0.3))
                        .foregroundStyle(.secondary)
                }
            }
    }
}

#Preview {
    VStack(spacing: 16) {
        ChallengeImageView(challenge: ChallengeRegistry.shared.all[0], size: 80)
        ChallengeImageView(challenge: ChallengeRegistry.shared.all[2], size: 60)
        ChallengeImageView(challenge: ChallengeRegistry.shared.all[4], size: 40)
    }
    .padding()
}
