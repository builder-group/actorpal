//
//  CompletedView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import Photos
import SwiftData
import SwiftUI

struct CompletedView: View {
    let derive: Derive
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var showSaveSuccess = false
    @State private var showSaveError = false
    @State private var showDeleteConfirm = false

    private var durationText: String {
        guard let completedAt = derive.completedAt else { return "—" }
        let interval = completedAt.timeIntervalSince(derive.startedAt)
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.day, .hour, .minute]
        formatter.unitsStyle = .abbreviated
        formatter.maximumUnitCount = 2
        return formatter.string(from: interval) ?? "—"
    }

    private var completedDateText: String {
        guard let completedAt = derive.completedAt else { return "—" }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: completedAt)
    }

    // MARK: - UI

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                promptLabel

                Spacer().frame(height: 24)

                GridView(photos: derive.photos, onSlotTap: { _ in })

                Spacer().frame(height: 24)

                statsRow

                Spacer().frame(height: 40)
            }
            .padding(.horizontal, 24)
        }
        .scrollIndicators(.hidden)
        .background(Color.appBackground)
        .navigationBarHidden(false)
        .navigationTitle(derive.challenge?.title ?? "Dérive")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        saveToLibrary()
                    } label: {
                        Label("Save to Photos", systemImage: "square.and.arrow.down")
                    }

                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .alert("Saved!", isPresented: $showSaveSuccess) {
            Button("OK") {}
        } message: {
            Text("Your dérive has been saved to Photos.")
        }
        .alert("Error", isPresented: $showSaveError) {
            Button("OK") {}
        } message: {
            Text("Could not save to Photos. Please check permissions in Settings.")
        }
        .alert("Delete Dérive?", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                deleteDerive()
            }
        } message: {
            Text("This will permanently delete this dérive and all its photos.")
        }
    }

    private var promptLabel: some View {
        Text(derive.prompt)
            .font(.body)
            .foregroundStyle(.secondary)
    }

    private var statsRow: some View {
        HStack(spacing: 32) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Completed")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(completedDateText)
                    .font(.subheadline.weight(.medium))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Duration")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(durationText)
                    .font(.subheadline.weight(.medium))
            }

            Spacer()
        }
    }

    // MARK: - Actions

    private func deleteDerive() {
        modelContext.delete(derive)
        try? modelContext.save()
        dismiss()
    }

    private func saveToLibrary() {
        let image = createGridImage(from: derive.photos)

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                DispatchQueue.main.async { showSaveError = true }
                return
            }

            PHPhotoLibrary.shared().performChanges {
                PHAssetCreationRequest.creationRequestForAsset(from: image)
            } completionHandler: { success, _ in
                DispatchQueue.main.async {
                    if success {
                        showSaveSuccess = true
                    } else {
                        showSaveError = true
                    }
                }
            }
        }
    }

    private func createGridImage(from photos: [PhotoSlot]) -> UIImage {
        let cellSize: CGFloat = 400
        let spacing: CGFloat = 4
        let gridSize = cellSize * 3 + spacing * 2

        let renderer = UIGraphicsImageRenderer(
            size: CGSize(width: gridSize, height: gridSize)
        )

        return renderer.image { ctx in
            UIColor.systemBackground.setFill()
            ctx.fill(
                CGRect(
                    origin: .zero,
                    size: CGSize(width: gridSize, height: gridSize)
                )
            )

            for (index, slot) in photos.enumerated() {
                let row = index / 3
                let col = index % 3
                let x = CGFloat(col) * (cellSize + spacing)
                let y = CGFloat(row) * (cellSize + spacing)
                let rect = CGRect(x: x, y: y, width: cellSize, height: cellSize)

                if let data = slot.imageData, let image = UIImage(data: data) {
                    image.draw(in: rect)
                } else {
                    UIColor.secondarySystemBackground.setFill()
                    ctx.fill(rect)
                }
            }

            // Watermark
            if let logo = UIImage(named: "logo") {
                let maxSize: CGFloat = 48
                let padding: CGFloat = 16
                let aspectRatio = logo.size.width / logo.size.height
                let watermarkWidth = aspectRatio >= 1 ? maxSize : maxSize * aspectRatio
                let watermarkHeight = aspectRatio >= 1 ? maxSize / aspectRatio : maxSize
                let watermarkRect = CGRect(
                    x: gridSize - watermarkWidth - padding,
                    y: gridSize - watermarkHeight - padding,
                    width: watermarkWidth,
                    height: watermarkHeight
                )
                logo.withTintColor(.white.withAlphaComponent(0.5), renderingMode: .alwaysOriginal)
                    .draw(in: watermarkRect)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        CompletedView(derive: Derive(challengeId: "yellow", player: Player()))
    }
}
