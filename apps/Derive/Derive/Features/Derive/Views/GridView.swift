//
//  GridView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI

struct GridView: View {
    let photos: [PhotoSlot]
    var selectedIndex: Int?
    var spacing: CGFloat = 4
    let onSlotTap: (Int) -> Void

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
                    GridCellView(slot: slot, isSelected: selectedIndex == index) {
                        onSlotTap(index)
                    }
                    .frame(width: cellSize, height: cellSize)
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

struct GridThumbnail: View {
    let photos: [PhotoSlot]
    var spacing: CGFloat = 2

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
                ForEach(photos) { slot in
                    ZStack {
                        if let data = slot.imageData, let image = UIImage(data: data) {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                        } else {
                            Color.appCard
                        }
                    }
                    .frame(width: cellSize, height: cellSize)
                    .clipped()
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
