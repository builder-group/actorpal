//
//  GridCellView.swift
//  Derive
//

import SwiftUI

struct GridCellView: View {
    let slot: PhotoSlot
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack {
                if let imageData = slot.imageData,
                   let uiImage = UIImage(data: imageData)
                {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                } else {
                    emptyState
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .aspectRatio(1, contentMode: .fit)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(GridCellButtonStyle())
    }

    // MARK: - UI

    private var emptyState: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.deriveSand.opacity(0.6))

            Circle()
                .fill(Color(.systemBackground))
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Color.deriveTerracotta)
                }
        }
    }
}

// MARK: - Button Style

struct GridCellButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

#Preview {
    HStack {
        GridCellView(slot: PhotoSlot(), onTap: {})
        GridCellView(slot: PhotoSlot(), onTap: {})
        GridCellView(slot: PhotoSlot(), onTap: {})
    }
    .padding()
    .background(Color.deriveBackground)
}
