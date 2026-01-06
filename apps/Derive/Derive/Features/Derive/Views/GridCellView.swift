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
                   let uiImage = UIImage(data: imageData) {
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
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - UI

    private var emptyState: some View {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(Color(.systemGray5))
            .overlay {
                Image(systemName: "plus")
                    .font(.title2)
                    .foregroundStyle(.tertiary)
            }
    }
}

#Preview {
    HStack {
        GridCellView(slot: PhotoSlot(), onTap: {})
        GridCellView(slot: PhotoSlot(), onTap: {})
        GridCellView(slot: PhotoSlot(), onTap: {})
    }
    .padding()
}
