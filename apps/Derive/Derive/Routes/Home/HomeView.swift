//
//  HomeView.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import PhotosUI
import SwiftData
import SwiftUI

struct HomeView: View {
    @Binding var selectedTab: AppTab
    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext

    @State private var selectedSlotIndex: Int?
    @State private var showCamera = false
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var isProcessing = false
    @State private var selectedCompletedDerive: Derive?

    private var selectedSlotIsEmpty: Bool {
        guard let index = selectedSlotIndex,
            let derive = player.activeDerive
        else { return true }
        return derive.photos[index].imageData == nil
    }

    private var emptySlotCount: Int {
        player.activeDerive?.photos.filter { $0.imageData == nil }.count ?? 0
    }

    private var navigationTitle: String {
        player.activeDerive?.challenge?.title ?? "Dérive"
    }

    // MARK: - UI

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Spacer().frame(height: 60)

                titleLabel

                if let derive = player.activeDerive {
                    Spacer().frame(height: 4)
                    promptLabel(derive)
                    Spacer().frame(height: 24)
                    deriveContent(derive)
                } else {
                    emptyStateContent
                }

                if !player.completedDerives.isEmpty {
                    historySection
                }

                Spacer().frame(height: 40)
            }
            .padding(.horizontal, 24)
        }
        .scrollIndicators(.hidden)
        .background(Color.appBackground)
        .navigationBarHidden(true)
        .navigationDestination(item: $selectedCompletedDerive) { derive in
            CompletedView(derive: derive)
        }
        .overlay { processingOverlay }
    }

    private var titleLabel: some View {
        HStack(spacing: 8) {
            if let color = player.activeDerive?.challenge?.color {
                RoundedRectangle(cornerRadius: 4)
                    .fill(color)
                    .frame(width: 20, height: 20)
            }

            Text(navigationTitle)
                .font(.erode(36, weight: .bold))
        }
    }

    private func promptLabel(_ derive: Derive) -> some View {
        Text(derive.prompt)
            .font(.body)
            .foregroundStyle(.secondary)
    }

    @ViewBuilder
    private func deriveContent(_ derive: Derive) -> some View {
        photoGrid(derive)
            .overlay { photoActionOverlay(derive) }

        Spacer().frame(height: 24)

        completeRow(derive)
            .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { image in
                if let image, let derive = player.activeDerive {
                    saveCameraPhoto(image, to: derive)
                }
                showCamera = false
            }
            .ignoresSafeArea()
        }
        .onChange(of: selectedPhotos) { _, items in
            guard !items.isEmpty, let derive = player.activeDerive else {
                return
            }
            Task { await loadSelectedPhotos(items, for: derive) }
        }
    }

    @ViewBuilder
    private func photoActionOverlay(_ derive: Derive) -> some View {
        if selectedSlotIndex != nil {
            ZStack(alignment: .bottomTrailing) {
                Color.black.opacity(0.01)
                    .onTapGesture { selectedSlotIndex = nil }

                VStack(alignment: .trailing, spacing: 8) {
                    if selectedSlotIsEmpty {
                        PhotosPicker(
                            selection: $selectedPhotos,
                            maxSelectionCount: emptySlotCount,
                            matching: .images
                        ) {
                            actionButton("Select Photos")
                        }
                    } else {
                        PhotosPicker(
                            selection: $selectedPhotos,
                            maxSelectionCount: 1,
                            matching: .images
                        ) {
                            actionButton("Replace Photo")
                        }
                    }

                    Button {
                        showCamera = true
                    } label: {
                        actionButton("Camera")
                    }

                    Button {
                        selectedSlotIndex = nil
                    } label: {
                        actionButtonSecondary("Cancel")
                    }
                }
                .padding(16)
                .background {
                    Circle()
                        .fill(Color.appBackground)
                        .frame(width: 300, height: 300)
                        .blur(radius: 30)
                        .offset(x: 40, y: 40)
                }
            }
            .clipShape(Rectangle())
        }
    }

    private func actionButton(_ title: String) -> some View {
        Text(title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.primary)
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color.appCard)
            .clipShape(Capsule())
    }

    private func actionButtonSecondary(_ title: String) -> some View {
        Text(title)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
    }

    private func photoGrid(_ derive: Derive) -> some View {
        GridView(photos: derive.photos, selectedIndex: selectedSlotIndex) { index in
            selectedSlotIndex = index
        }
    }

    private func completeRow(_ derive: Derive) -> some View {
        let canComplete = derive.filledCount > 0

        return HStack {
            Spacer()
            Button {
                completeDerive(derive)
            } label: {
                Text("Complete")
                    .font(.headline)
                    .foregroundStyle(Color.appCtaContent)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 14)
                    .background(canComplete ? Color.appCta : Color.gray)
                    .clipShape(Capsule())
            }
            .disabled(!canComplete)
        }
    }

    @ViewBuilder
    private var processingOverlay: some View {
        if isProcessing {
            ZStack {
                Color.black.opacity(0.3).ignoresSafeArea()
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.5)
            }
        }
    }

    private var emptyStateContent: some View {
        VStack(spacing: 16) {
            Spacer().frame(height: 100)
            Image(systemName: "square.grid.3x3")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("No Active Dérive")
                .font(.erode(24, weight: .semibold))
            Text("Pick a color and start exploring.")
                .font(.body)
                .foregroundStyle(.secondary)

            Spacer().frame(height: 8)

            Button {
                selectedTab = .discover
            } label: {
                Text("Discover")
                    .font(.headline)
                    .foregroundStyle(Color.appCtaContent)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 14)
                    .background(Color.appCta)
                    .clipShape(Capsule())
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 40)
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Spacer().frame(height: 24)

            Text("History")
                .font(.erode(24, weight: .semibold))

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 8),
                    GridItem(.flexible(), spacing: 8),
                    GridItem(.flexible(), spacing: 8),
                ],
                spacing: 8
            ) {
                ForEach(player.completedDerives) { derive in
                    historyItem(derive)
                }
            }
        }
    }

    private func historyItem(_ derive: Derive) -> some View {
        Button {
            selectedCompletedDerive = derive
        } label: {
            GridThumbnail(photos: derive.photos)
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Actions

    private func saveCameraPhoto(_ image: UIImage, to derive: Derive) {
        guard let index = selectedSlotIndex,
            let data = processImage(image)
        else { return }

        var photos = derive.photos
        photos[index] = PhotoSlot(
            id: photos[index].id,
            imageData: data,
            capturedAt: Date()
        )
        derive.photos = photos
        try? modelContext.save()
        selectedSlotIndex = nil
    }

    @MainActor
    private func loadSelectedPhotos(
        _ items: [PhotosPickerItem],
        for derive: Derive
    ) async {
        isProcessing = true
        defer {
            isProcessing = false
            selectedPhotos = []
            selectedSlotIndex = nil
        }

        guard let tappedIndex = selectedSlotIndex else { return }
        let tappedSlotIsEmpty = derive.photos[tappedIndex].imageData == nil

        var photos = derive.photos

        if tappedSlotIsEmpty {
            // Fill empty slots starting from tapped, then others
            var emptyIndices = derive.photos.enumerated()
                .filter { $0.element.imageData == nil }
                .map { $0.offset }
                .sorted { a, b in
                    // Prioritize tapped index first
                    if a == tappedIndex { return true }
                    if b == tappedIndex { return false }
                    return a < b
                }

            for item in items {
                guard !emptyIndices.isEmpty else { break }

                if let data = try? await item.loadTransferable(type: Data.self),
                    let image = UIImage(data: data),
                    let processed = processImage(image)
                {
                    let index = emptyIndices.removeFirst()
                    photos[index] = PhotoSlot(
                        id: photos[index].id,
                        imageData: processed,
                        capturedAt: Date()
                    )
                }
            }
        } else {
            // Replace single photo at tapped index
            if let item = items.first,
                let data = try? await item.loadTransferable(type: Data.self),
                let image = UIImage(data: data),
                let processed = processImage(image)
            {
                photos[tappedIndex] = PhotoSlot(
                    id: photos[tappedIndex].id,
                    imageData: processed,
                    capturedAt: Date()
                )
            }
        }

        derive.photos = photos
        try? modelContext.save()
    }

    private func completeDerive(_ derive: Derive) {
        derive.completedAt = Date()
        try? modelContext.save()
        selectedCompletedDerive = derive
    }

    // MARK: - Image Processing

    private func processImage(_ image: UIImage) -> Data? {
        let size = image.size
        let shortSide = min(size.width, size.height)
        let cropRect = CGRect(
            x: (size.width - shortSide) / 2,
            y: (size.height - shortSide) / 2,
            width: shortSide,
            height: shortSide
        )

        guard let cgImage = image.cgImage?.cropping(to: cropRect) else {
            return nil
        }

        let cropped = UIImage(
            cgImage: cgImage,
            scale: image.scale,
            orientation: image.imageOrientation
        )
        let maxDim = AppConfig.maxImageDimension
        let finalSize = shortSide > maxDim ? maxDim : shortSide

        let renderer = UIGraphicsImageRenderer(
            size: CGSize(width: finalSize, height: finalSize)
        )
        let resized = renderer.image { _ in
            cropped.draw(
                in: CGRect(
                    origin: .zero,
                    size: CGSize(width: finalSize, height: finalSize)
                )
            )
        }

        return resized.jpegData(compressionQuality: 0.8)
    }
}

// MARK: - Preview

#Preview("Empty") {
    NavigationStack {
        HomeView(selectedTab: .constant(.derive))
    }
    .previewDataContainer { ctx in
        Player.instance(with: ctx).onboardingCompletedAt = Date()
    }
}

#Preview("Active") {
    NavigationStack {
        HomeView(selectedTab: .constant(.derive))
    }
    .previewDataContainer { ctx in
        let player = Player.instance(with: ctx)
        player.onboardingCompletedAt = Date()
        ctx.insert(Derive(challengeId: "yellow", player: player))
    }
}
