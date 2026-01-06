//
//  HomeView.swift
//  Derive
//

import Combine
import PhotosUI
import SwiftData
import SwiftUI

struct HomeView: View {
    @QuerySingleton private var player: Player
    @Environment(\.modelContext) private var modelContext

    @State private var selectedSlotIndex: Int?
    @State private var showPhotoSourcePicker = false
    @State private var showCamera = false
    @State private var showPhotoLibrary = false
    @State private var selectedPhotoItem: PhotosPickerItem?

    var body: some View {
        Group {
            if let derive = player.activeDerive {
                activeDeriveView(derive)
            } else {
                emptyStateView
            }
        }
        .background(Color.deriveBackground.ignoresSafeArea())
    }

    // MARK: - Active Derive

    private func activeDeriveView(_ derive: Derive) -> some View {
        let accentColor = derive.challenge?.color ?? .accentColor

        return ScrollView {
            VStack(spacing: 24) {
                // Progress card
                progressCard(derive, accentColor: accentColor)
                    .padding(.horizontal)

                // Grid section
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Your Grid")
                            .font(.title3)
                            .fontWeight(.bold)

                        Spacer()

                        Text("\(derive.filledCount)/9")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(accentColor)
                    }
                    .padding(.horizontal)

                    GridView(photos: derive.photos) { index in
                        selectedSlotIndex = index
                        showPhotoSourcePicker = true
                    }
                    .padding(.horizontal)
                }

                if derive.isComplete {
                    completeSection(derive, accentColor: accentColor)
                        .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .navigationTitle(derive.prompt)
        .navigationBarTitleDisplayMode(.large)
        .confirmationDialog("Add Photo", isPresented: $showPhotoSourcePicker) {
            Button("Take Photo") { showCamera = true }
            Button("Choose from Library") { showPhotoLibrary = true }
            Button("Cancel", role: .cancel) { selectedSlotIndex = nil }
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { image in
                if let image, let derive = player.activeDerive {
                    savePhoto(image, to: derive)
                }
                showCamera = false
            }
            .ignoresSafeArea()
        }
        .photosPicker(
            isPresented: $showPhotoLibrary,
            selection: $selectedPhotoItem,
            matching: .images
        )
        .onChange(of: selectedPhotoItem) { _, newItem in
            guard let newItem else { return }
            Task {
                if let image = try? await newItem.loadTransferable(type: TransferableImage.self),
                   let derive = player.activeDerive
                {
                    await MainActor.run { savePhoto(image.uiImage, to: derive) }
                }
                await MainActor.run { selectedPhotoItem = nil }
            }
        }
    }

    private func progressCard(_ derive: Derive, accentColor: Color) -> some View {
        HStack(spacing: 20) {
            // Progress ring
            ZStack {
                Circle()
                    .stroke(accentColor.opacity(0.2), lineWidth: 10)

                Circle()
                    .trim(from: 0, to: Double(derive.filledCount) / 9.0)
                    .stroke(
                        accentColor,
                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .animation(.spring(response: 0.6), value: derive.filledCount)

                VStack(spacing: 2) {
                    Text("\(derive.filledCount)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))

                    Text("of 9")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 90, height: 90)

            VStack(alignment: .leading, spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Time Left")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    TimeRemainingLabel(endsAt: derive.endsAt)
                        .font(.title2)
                        .fontWeight(.bold)
                }

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(accentColor.opacity(0.2))

                        RoundedRectangle(cornerRadius: 4)
                            .fill(accentColor)
                            .frame(width: geo.size.width * Double(derive.filledCount) / 9.0)
                            .animation(.spring(response: 0.6), value: derive.filledCount)
                    }
                }
                .frame(height: 8)
            }

            Spacer()
        }
        .padding(20)
        .deriveCard()
    }

    private func completeSection(_ derive: Derive, accentColor: Color) -> some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title)
                    .foregroundStyle(Color.deriveSage)

                Text("Grid Complete!")
                    .font(.title3)
                    .fontWeight(.bold)
            }

            Button {
                // TODO: Share
            } label: {
                Label("Share Your Derive", systemImage: "square.and.arrow.up")
            }
            .buttonStyle(.derivePrimary(color: accentColor))
        }
        .padding(20)
        .deriveCard()
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        ScrollView {
            VStack(spacing: 32) {
                Spacer(minLength: 40)

                // Illustration placeholder
                ZStack {
                    Circle()
                        .fill(Color.deriveSand)
                        .frame(width: 140, height: 140)

                    Image(systemName: "figure.walk")
                        .font(.system(size: 60))
                        .foregroundStyle(Color.deriveTerracotta)
                }

                VStack(spacing: 12) {
                    Text("Ready to wander?")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Pick a creative prompt and start\ncapturing your surroundings")
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                featuredSuggestion

                Spacer(minLength: 40)
            }
            .padding()
        }
        .navigationTitle("Derive")
    }

    private var featuredSuggestion: some View {
        let featured = ChallengeRegistry.shared.featured
        let accentColor = featured.color ?? .accentColor

        return NavigationLink {
            ChallengeDetailView(challenge: featured)
        } label: {
            VStack(spacing: 0) {
                // Header with badge
                HStack {
                    Label("Featured", systemImage: "star.fill")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(accentColor))

                    Spacer()
                }
                .padding()
                .background(accentColor.opacity(0.15))

                // Content
                HStack(spacing: 14) {
                    ChallengeImageView(challenge: featured, size: 56)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(featured.prompt)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)

                        Text(featured.durationText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Image(systemName: "arrow.right.circle.fill")
                        .font(.title2)
                        .foregroundStyle(accentColor)
                }
                .padding()
            }
            .deriveCard()
        }
        .buttonStyle(.plain)
    }

    // MARK: - Actions

    private func savePhoto(_ image: UIImage, to derive: Derive) {
        guard let index = selectedSlotIndex else { return }
        guard let imageData = cropAndResizeImage(image) else { return }

        var photos = derive.photos
        photos[index] = PhotoSlot(
            id: photos[index].id,
            imageData: imageData,
            capturedAt: Date()
        )
        derive.photos = photos
        try? modelContext.save()
        selectedSlotIndex = nil
    }

    private func cropAndResizeImage(_ image: UIImage) -> Data? {
        let size = image.size
        let shortSide = min(size.width, size.height)
        let cropRect = CGRect(
            x: (size.width - shortSide) / 2,
            y: (size.height - shortSide) / 2,
            width: shortSide,
            height: shortSide
        )

        guard let cgImage = image.cgImage?.cropping(to: cropRect) else { return nil }

        let croppedImage = UIImage(
            cgImage: cgImage,
            scale: image.scale,
            orientation: image.imageOrientation
        )

        let maxDimension = AppConfig.maxImageDimension
        let finalSize = shortSide > maxDimension ? maxDimension : shortSide

        let renderer = UIGraphicsImageRenderer(
            size: CGSize(width: finalSize, height: finalSize)
        )
        let resized = renderer.image { _ in
            croppedImage.draw(
                in: CGRect(origin: .zero, size: CGSize(width: finalSize, height: finalSize))
            )
        }

        return resized.jpegData(compressionQuality: 0.8)
    }
}

// MARK: - Time Remaining Label

struct TimeRemainingLabel: View {
    let endsAt: Date

    @State private var timeRemaining: TimeInterval = 0

    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        Text(formattedTime)
            .monospacedDigit()
            .onAppear { updateTime() }
            .onReceive(timer) { _ in updateTime() }
    }

    private var formattedTime: String {
        if timeRemaining <= 0 { return "Time's up!" }

        let days = Int(timeRemaining) / 86400
        let hours = (Int(timeRemaining) % 86400) / 3600
        let minutes = (Int(timeRemaining) % 3600) / 60

        if days > 0 {
            return "\(days)d \(hours)h"
        } else if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }

    private func updateTime() {
        timeRemaining = max(0, endsAt.timeIntervalSinceNow)
    }
}

#Preview("Empty") {
    NavigationStack {
        HomeView()
    }
    .previewDataContainer { context in
        let player = Player.instance(with: context)
        player.onboardingCompletedAt = Date()
    }
}

#Preview("With Active") {
    NavigationStack {
        HomeView()
    }
    .previewDataContainer { context in
        let player = Player.instance(with: context)
        player.onboardingCompletedAt = Date()
        let derive = Derive(challengeId: "yellow", player: player)
        context.insert(derive)
    }
}
