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
                if let data = slot.imageData, let image = UIImage(data: data) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                } else {
                    Color(.tertiarySystemFill)
                    Image(systemName: "plus")
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HStack(spacing: 2) {
        GridCellView(slot: PhotoSlot(), onTap: {})
        GridCellView(slot: PhotoSlot(), onTap: {})
        GridCellView(slot: PhotoSlot(), onTap: {})
    }
    .frame(height: 100)
    .padding()
}
