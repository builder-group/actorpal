//
//  GridCellView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct GridCellView: View {
    let slot: PhotoSlot
    var isSelected: Bool = false
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack {
                if let data = slot.imageData, let image = UIImage(data: data) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                } else {
                    Color.appCard
                    Image(systemName: "plus")
                        .font(.title3)
                        .foregroundStyle(.tertiary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
            .opacity(isSelected ? 0.5 : 1)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HStack(spacing: 4) {
        GridCellView(slot: PhotoSlot(), onTap: {})
        GridCellView(slot: PhotoSlot(), onTap: {})
        GridCellView(slot: PhotoSlot(), onTap: {})
    }
    .frame(height: 120)
    .padding()
    .background(Color.appBackground)
}
