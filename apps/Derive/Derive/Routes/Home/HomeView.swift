//
//  HomeView.swift
//  Derive
//

import Combine
import Photos
import PhotosUI
import SwiftData
import SwiftUI

struct HomeView: View {
    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext

    @State private var selectedSlotIndex: Int?
    @State private var showCamera = false
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var isProcessing = false
    @State private var showSaveSuccess = false
    @State private var showSaveError = false

    var body: some View {
        Group {
            if let derive = player.activeDerive {
                activeDeriveView(derive)
            } else {
                emptyStateView
            }
        }
        .alert("Saved!", isPresented: $showSaveSuccess) {
            Button("OK") {}
        } message: {
            Text("Your derive grid has been saved to Photos.")
        }
        .alert("Error", isPresented: $showSaveError) {
            Button("OK") {}
        } message: {
            Text("Could not save to Photos. Please check permissions in Settings.")
        }
    }

    // MARK: - Active Derive

    private func activeDeriveView(_ derive: Derive) -> some View {
        let emptyCount = derive.photos.filter { $0.imageData == nil }.count

        return ScrollView {
            VStack(spacing: 24) {
                gridSection(derive)

                if !derive.isComplete {
                    addPhotosSection(derive, emptyCount: emptyCount)
                }

                if derive.isComplete {
                    completeSection(derive)
                }

                progressSection(derive)
            }
            .padding()
        }
        .navigationTitle(derive.prompt)
        .confirmationDialog("Add Photo", isPresented: .constant(selectedSlotIndex != nil)) {
            Button("Take Photo") {
                showCamera = true
            }
            Button("Cancel", role: .cancel) {
                selectedSlotIndex = nil
            }
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { image in
                if let image, let derive = player.activeDerive {
                    saveSinglePhoto(image, to: derive)
                }
                showCamera = false
            }
            .ignoresSafeArea()
        }
        .onChange(of: selectedPhotos) { _, items in
            guard !items.isEmpty, let derive = player.activeDerive else { return }
            Task { await processPhotos(items, for: derive) }
        }
    }

    private func gridSection(_ derive: Derive) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("\(derive.filledCount) of 9")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                if derive.isComplete {
                    Label("Complete", systemImage: "checkmark.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(.green)
                }
            }

            GridView(photos: derive.photos) { index in
                if derive.photos[index].imageData == nil {
                    selectedSlotIndex = index
                }
            }
        }
    }

    private func addPhotosSection(_ derive: Derive, emptyCount: Int) -> some View {
        VStack(spacing: 12) {
            PhotosPicker(
                selection: $selectedPhotos,
                maxSelectionCount: emptyCount,
                matching: .images
            ) {
                Label(
                    emptyCount == 9 ? "Add Photos" : "Add \(emptyCount) More Photos",
                    systemImage: "photo.on.rectangle.angled"
                )
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(isProcessing)

            if isProcessing {
                ProgressView("Processing photos...")
            }
        }
    }

    private func completeSection(_ derive: Derive) -> some View {
        VStack(spacing: 16) {
            Text("Your derive is complete!")
                .font(.headline)

            Button {
                saveGridToLibrary(derive)
            } label: {
                Label("Save to Photos", systemImage: "square.and.arrow.down")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func progressSection(_ derive: Derive) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "clock")
                    .foregroundStyle(.secondary)
                Text("Time remaining")
                    .foregroundStyle(.secondary)
                Spacer()
                TimeRemainingLabel(endsAt: derive.endsAt)
                    .fontWeight(.medium)
            }
            .font(.subheadline)

            ProgressView(value: Double(derive.filledCount), total: 9)
                .tint(derive.challenge?.color ?? .accentColor)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No Active Derive", systemImage: "square.grid.3x3")
        } description: {
            Text("Pick a color challenge from Discover to start.")
        }
        .navigationTitle("Derive")
    }

    // MARK: - Actions

    private func saveSinglePhoto(_ image: UIImage, to derive: Derive) {
        guard let index = selectedSlotIndex else { return }
        guard let data = processImage(image) else { return }

        var photos = derive.photos
        photos[index] = PhotoSlot(id: photos[index].id, imageData: data, capturedAt: Date())
        derive.photos = photos
        try? modelContext.save()
        selectedSlotIndex = nil
    }

    @MainActor
    private func processPhotos(_ items: [PhotosPickerItem], for derive: Derive) async {
        isProcessing = true
        defer {
            isProcessing = false
            selectedPhotos = []
        }

        var emptyIndices = derive.photos.enumerated()
            .filter { $0.element.imageData == nil }
            .map { $0.offset }

        var photos = derive.photos

        for item in items {
            guard !emptyIndices.isEmpty else { break }

            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data),
               let processed = processImage(image)
            {
                let index = emptyIndices.removeFirst()
                photos[index] = PhotoSlot(id: photos[index].id, imageData: processed, capturedAt: Date())
            }
        }

        derive.photos = photos
        try? modelContext.save()
    }

    private func saveGridToLibrary(_ derive: Derive) {
        let image = createGridImage(from: derive.photos)

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                DispatchQueue.main.async {
                    showSaveError = true
                }
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

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: gridSize, height: gridSize))

        return renderer.image { ctx in
            UIColor.systemBackground.setFill()
            ctx.fill(CGRect(origin: .zero, size: CGSize(width: gridSize, height: gridSize)))

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
        }
    }

    private func processImage(_ image: UIImage) -> Data? {
        let size = image.size
        let shortSide = min(size.width, size.height)
        let cropRect = CGRect(
            x: (size.width - shortSide) / 2,
            y: (size.height - shortSide) / 2,
            width: shortSide,
            height: shortSide
        )

        guard let cgImage = image.cgImage?.cropping(to: cropRect) else { return nil }

        let cropped = UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)
        let maxDim = AppConfig.maxImageDimension
        let finalSize = shortSide > maxDim ? maxDim : shortSide

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: finalSize, height: finalSize))
        let resized = renderer.image { _ in
            cropped.draw(in: CGRect(origin: .zero, size: CGSize(width: finalSize, height: finalSize)))
        }

        return resized.jpegData(compressionQuality: 0.8)
    }
}

// MARK: - Time Remaining

struct TimeRemainingLabel: View {
    let endsAt: Date

    @State private var remaining: TimeInterval = 0
    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        Text(formatted)
            .monospacedDigit()
            .onAppear { update() }
            .onReceive(timer) { _ in update() }
    }

    private var formatted: String {
        if remaining <= 0 { return "Time's up!" }

        let days = Int(remaining) / 86400
        let hours = (Int(remaining) % 86400) / 3600

        if days > 0 {
            return "\(days)d \(hours)h"
        } else {
            let minutes = (Int(remaining) % 3600) / 60
            return "\(hours)h \(minutes)m"
        }
    }

    private func update() {
        remaining = max(0, endsAt.timeIntervalSinceNow)
    }
}

#Preview("Empty") {
    NavigationStack {
        HomeView()
    }
    .previewDataContainer { ctx in
        Player.instance(with: ctx).onboardingCompletedAt = Date()
    }
}

#Preview("Active") {
    NavigationStack {
        HomeView()
    }
    .previewDataContainer { ctx in
        let player = Player.instance(with: ctx)
        player.onboardingCompletedAt = Date()
        ctx.insert(Derive(challengeId: "yellow", player: player))
    }
}
