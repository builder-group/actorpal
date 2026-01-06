//
//  HistoryView.swift
//  Derive
//

import SwiftData
import SwiftUI

struct HistoryView: View {
    @QuerySingleton private var player: Player

    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16),
    ]

    var body: some View {
        Group {
            if player.completedDerives.isEmpty {
                emptyState
            } else {
                historyList
            }
        }
        .background(Color.deriveBackground.ignoresSafeArea())
        .navigationTitle("History")
    }

    // MARK: - UI

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()

            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 48))
                .foregroundStyle(.tertiary)

            VStack(spacing: 8) {
                Text("No completed derives yet")
                    .font(.headline)
                    .foregroundStyle(.secondary)

                Text("Complete a challenge to see it here")
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private var historyList: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(player.completedDerives) { derive in
                    historyCard(derive)
                }
            }
            .padding()
        }
    }

    private func historyCard(_ derive: Derive) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            miniGrid(derive.photos)
                .aspectRatio(1, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text(derive.prompt)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Text(derive.progressText)
                        .font(.caption2)
                        .foregroundStyle(derive.isComplete ? Color.secondary : Color.orange)

                    if let date = derive.completedAt {
                        Text("·")
                            .foregroundStyle(.tertiary)
                        Text(date, style: .date)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
        }
    }

    private func miniGrid(_ photos: [PhotoSlot]) -> some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 3)

        return LazyVGrid(columns: columns, spacing: 2) {
            ForEach(photos) { slot in
                ZStack {
                    if let data = slot.imageData,
                       let image = UIImage(data: data) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                    } else {
                        Color(.systemGray5)
                    }
                }
                .aspectRatio(1, contentMode: .fit)
                .clipped()
            }
        }
    }
}

#Preview("Empty") {
    NavigationStack {
        HistoryView()
    }
    .previewDataContainer()
}

#Preview("With History") {
    NavigationStack {
        HistoryView()
    }
    .previewDataContainer { context in
        let player = Player.instance(with: context)

        let derive1 = Derive(challengeId: "yellow", player: player)
        derive1.completedAt = Date().addingTimeInterval(-86400)
        context.insert(derive1)

        let derive2 = Derive(challengeId: "circles", player: player)
        derive2.completedAt = Date().addingTimeInterval(-172800)
        context.insert(derive2)
    }
}
