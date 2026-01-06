//
//  DeriveView.swift
//  Derive
//

import Combine
import PhotosUI
import SwiftData
import SwiftUI

/// Active derive view — the main screen when a derive is in progress.
struct DeriveView: View {
    @Bindable var derive: Derive

    @Environment(\.modelContext) private var modelContext
    @State private var selectedSlotIndex: Int?
    @State private var showPhotoSourcePicker = false
    @State private var showCamera = false
    @State private var showPhotoLibrary = false
    @State private var selectedPhotoItem: PhotosPickerItem?

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection
                gridSection
                if derive.isComplete {
                    shareSection
                }
            }
            .padding()
        }
        .confirmationDialog("Add Photo", isPresented: $showPhotoSourcePicker) {
            Button("Take Photo") {
                showCamera = true
            }
            Button("Choose from Library") {
                showPhotoLibrary = true
            }
            Button("Cancel", role: .cancel) {
                selectedSlotIndex = nil
            }
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker { image in
                if let image {
                    savePhoto(image)
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
                if let image = try? await newItem.loadTransferable(type: TransferableImage.self) {
                    await MainActor.run {
                        savePhoto(image.uiImage)
                    }
                }
                await MainActor.run {
                    selectedPhotoItem = nil
                }
            }
        }
    }

    // MARK: - UI

    private var headerSection: some View {
        VStack(spacing: 8) {
            Text(derive.prompt)
                .font(.headline)
                .foregroundStyle(.secondary)

            Text(derive.progressText)
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(derive.challenge?.color ?? .primary)

            TimeRemainingView(endsAt: derive.endsAt)
        }
    }

    private var gridSection: some View {
        GridView(photos: derive.photos) { index in
            selectedSlotIndex = index
            showPhotoSourcePicker = true
        }
    }

    private var shareSection: some View {
        VStack(spacing: 12) {
            Button {
                // TODO: Implement share
            } label: {
                Label("Share Grid", systemImage: "square.and.arrow.up")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(derive.challenge?.color ?? .accentColor)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            Button {
                completeDerive()
            } label: {
                Text("Complete Derive")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Actions

    private func completeDerive() {
        derive.completedAt = Date()
        try? modelContext.save()
    }

    private func savePhoto(_ image: UIImage) {
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
        // Crop to square (center crop)
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

        let croppedImage = UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)

        // Resize if needed
        let maxDimension = AppConfig.maxImageDimension
        let finalSize: CGFloat

        if shortSide > maxDimension {
            finalSize = maxDimension
        } else {
            finalSize = shortSide
        }

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: finalSize, height: finalSize))
        let resized = renderer.image { _ in
            croppedImage.draw(in: CGRect(origin: .zero, size: CGSize(width: finalSize, height: finalSize)))
        }

        return resized.jpegData(compressionQuality: 0.8)
    }
}

// MARK: - Transferable Image

struct TransferableImage: Transferable {
    let uiImage: UIImage

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(importedContentType: .image) { data in
            guard let image = UIImage(data: data) else {
                throw TransferError.importFailed
            }
            return TransferableImage(uiImage: image)
        }
    }

    enum TransferError: Error {
        case importFailed
    }
}

// MARK: - Camera Picker

struct CameraPicker: UIViewControllerRepresentable {
    let onImagePicked: (UIImage?) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onImagePicked: onImagePicked)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onImagePicked: (UIImage?) -> Void

        init(onImagePicked: @escaping (UIImage?) -> Void) {
            self.onImagePicked = onImagePicked
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            let image = info[.originalImage] as? UIImage
            onImagePicked(image)
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onImagePicked(nil)
        }
    }
}

// MARK: - Time Remaining View

struct TimeRemainingView: View {
    let endsAt: Date

    @State private var timeRemaining: TimeInterval = 0

    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        Label(formattedTime, systemImage: "clock")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .onAppear { updateTime() }
            .onReceive(timer) { _ in updateTime() }
    }

    private var formattedTime: String {
        if timeRemaining <= 0 {
            return "Time's up!"
        }

        let days = Int(timeRemaining) / 86400
        let hours = (Int(timeRemaining) % 86400) / 3600

        if days > 0 {
            return "\(days)d \(hours)h left"
        } else if hours > 0 {
            let minutes = (Int(timeRemaining) % 3600) / 60
            return "\(hours)h \(minutes)m left"
        } else {
            let minutes = Int(timeRemaining) / 60
            return "\(minutes)m left"
        }
    }

    private func updateTime() {
        timeRemaining = max(0, endsAt.timeIntervalSinceNow)
    }
}

#Preview {
    let player = Player()
    let derive = Derive(challengeId: "yellow", player: player)

    return NavigationStack {
        DeriveView(derive: derive)
    }
    .previewDataContainer { context in
        context.insert(player)
        context.insert(derive)
    }
}
