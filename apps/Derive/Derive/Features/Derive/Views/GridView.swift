//
//  GridView.swift
//  Derive
//

import SwiftUI

/// The 3×3 photo grid for a derive.
struct GridView: View {
    let photos: [PhotoSlot]
    let onSlotTap: (Int) -> Void

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 8) {
            ForEach(Array(photos.enumerated()), id: \.element.id) { index, slot in
                GridCellView(slot: slot) {
                    onSlotTap(index)
                }
            }
        }
    }
}

#Preview {
    let slots = (0..<9).map { _ in PhotoSlot() }
    return GridView(photos: slots, onSlotTap: { _ in })
        .padding()
}

#Preview("Partially Filled") {
    var slots = (0..<9).map { _ in PhotoSlot() }
    slots[0] = PhotoSlot(imageData: UIImage(systemName: "photo.fill")?.pngData())
    slots[4] = PhotoSlot(imageData: UIImage(systemName: "photo.fill")?.pngData())
    slots[8] = PhotoSlot(imageData: UIImage(systemName: "photo.fill")?.pngData())
    return GridView(photos: slots, onSlotTap: { _ in })
        .padding()
}
