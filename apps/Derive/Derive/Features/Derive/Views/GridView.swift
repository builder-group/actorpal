//
//  GridView.swift
//  Derive
//

import SwiftUI

struct GridView: View {
    let photos: [PhotoSlot]
    let onSlotTap: (Int) -> Void

    private let spacing: CGFloat = 2

    var body: some View {
        GeometryReader { geo in
            let cellSize = (geo.size.width - spacing * 2) / 3

            LazyVGrid(
                columns: [
                    GridItem(.fixed(cellSize), spacing: spacing),
                    GridItem(.fixed(cellSize), spacing: spacing),
                    GridItem(.fixed(cellSize), spacing: spacing),
                ],
                spacing: spacing
            ) {
                ForEach(Array(photos.enumerated()), id: \.element.id) { index, slot in
                    GridCellView(slot: slot) {
                        onSlotTap(index)
                    }
                    .frame(width: cellSize, height: cellSize)
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

#Preview {
    GridView(photos: (0 ..< 9).map { _ in PhotoSlot() }, onSlotTap: { _ in })
        .padding()
}
