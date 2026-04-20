import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var cameraExtensionActivationManager:
        CameraExtensionActivationManager
    @EnvironmentObject private var screenCaptureManager: ScreenCaptureManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                headerSection
                virtualCameraSection
                if !screenCaptureManager.isCapturing {
                    captureSourceSection
                }
                screenCaptureSection
                redactionSection
                if screenCaptureManager.isCapturing {
                    previewSection
                }
                actionSection
                if screenCaptureManager.isCapturing
                    && screenCaptureManager.isDebugMode
                {
                    visionSettingsSection
                }
                detailsSection
            }
            .frame(maxWidth: 720, alignment: .leading)
            .padding(32)
        }
        .task { screenCaptureManager.loadCaptureTargets() }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("NoDox")
                    .font(.largeTitle.bold())

                Spacer()

                Text(AppConfig.versionLabel)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.quaternary.opacity(0.55), in: Capsule())
            }

            Text(
                "Install the camera extension, start screen capture, then use regex-driven redaction to black out sensitive OCR matches before they reach the preview or virtual camera."
            )
            .foregroundStyle(.secondary)
        }
    }

    private var virtualCameraSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Virtual Camera")
                .font(.headline)

            VStack(alignment: .leading, spacing: 8) {
                Text(cameraExtensionActivationManager.statusTitle)
                    .font(.title3.weight(.semibold))

                Text(cameraExtensionActivationManager.statusMessage)
                    .foregroundStyle(.secondary)

                if cameraExtensionActivationManager.requiresUserApproval {
                    Button(
                        "Open System Settings",
                        action: cameraExtensionActivationManager
                            .openApprovalSettings
                    )
                    .buttonStyle(.link)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                .quaternary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 20)
            )
        }
    }

    private var screenCaptureSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Screen Capture")
                .font(.headline)

            VStack(alignment: .leading, spacing: 8) {
                Text(screenCaptureManager.statusTitle)
                    .font(.title3.weight(.semibold))

                Text(screenCaptureManager.statusMessage)
                    .foregroundStyle(.secondary)

                if screenCaptureManager.requiresCameraPermission {
                    Button(
                        "Open Camera Settings",
                        action: screenCaptureManager.openCameraPrivacySettings
                    )
                    .buttonStyle(.link)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                .quaternary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 20)
            )
        }
    }

    private var actionSection: some View {
        VStack(spacing: 12) {
            Button(action: cameraExtensionActivationManager.activateExtension) {
                Text(
                    cameraExtensionActivationManager.isActivating
                        ? "Requesting..."
                        : cameraExtensionActivationManager.actionTitle
                )
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(cameraExtensionActivationManager.isActivating)

            Button(action: screenCaptureManager.toggleCapture) {
                Text(screenCaptureManager.actionTitle)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)

            if screenCaptureManager.isCapturing {
                Button(action: screenCaptureManager.toggleDebugMode) {
                    Text(
                        screenCaptureManager.isDebugMode
                            ? "Hide Vision Debug Boxes"
                            : "Show Vision Debug Boxes"
                    )
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
                .tint(screenCaptureManager.isDebugMode ? .green : nil)
            }
        }
    }

    private var redactionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sensitive Text Redaction")
                .font(.headline)

            VStack(alignment: .leading, spacing: 16) {
                Toggle(
                    "Black out text that matches the regex list",
                    isOn: Binding(
                        get: { screenCaptureManager.isRedactionEnabled },
                        set: { screenCaptureManager.setRedactionEnabled($0) }
                    )
                )
                .toggleStyle(.switch)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Delivery Mode")
                        .font(.subheadline.weight(.medium))
                    Picker(
                        "Delivery Mode",
                        selection: Binding(
                            get: { screenCaptureManager.redactionMode },
                            set: { screenCaptureManager.setRedactionMode($0) }
                        )
                    ) {
                        ForEach(RedactionMode.allCases, id: \.self) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                    Text(redactionModeDescription)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if screenCaptureManager.redactionMode == .delayed {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Delay")
                                .font(.subheadline.weight(.medium))
                            Spacer()
                            Text(
                                "\(screenCaptureManager.delayedRedactionChunkSize) frames (~\(delayedRedactionDelayLabel)s)"
                            )
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                        }
                        Slider(
                            value: Binding(
                                get: {
                                    Double(
                                        screenCaptureManager
                                            .delayedRedactionChunkSize
                                    )
                                },
                                set: {
                                    screenCaptureManager
                                        .setDelayedRedactionChunkSize(
                                            Int($0.rounded())
                                        )
                                }
                            ),
                            in: Double(
                                AppConfig.minRedactionChunkSize
                            )...Double(AppConfig.maxRedactionChunkSize),
                            step: 1
                        )
                        Text(
                            "How many frames to buffer per chunk. Vision samples only the last frame in each chunk. If Vision falls behind, NoDox reuses the most recent sampled overlay so delay stays bounded instead of growing forever."
                        )
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Regex Patterns")
                            .font(.subheadline.weight(.medium))
                        Spacer()
                        Button {
                            screenCaptureManager.addRedactionPattern()
                        } label: {
                            Image(systemName: "plus")
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                    }

                    if screenCaptureManager.redactionPatterns.isEmpty {
                        Text("No patterns yet. Add one to start redacting.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(
                            Array(
                                screenCaptureManager.redactionPatterns.indices
                            ),
                            id: \.self
                        ) { index in
                            redactionPatternRow(index)
                        }
                    }

                    Text(
                        "Each row is compiled separately, and any matching pattern redacts the OCR box. This first pass still redacts whole Vision boxes, so merged OCR text can cover a full line."
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)

                    Text(
                        "Example exact-word pattern: \(AppConfig.exampleWordRedactionPattern)"
                    )
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)

                    Text(redactionPatternStatus)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                .quaternary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 20)
            )
        }
    }

    private var visionSettingsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Vision Settings")
                .font(.headline)

            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Recognition Quality")
                        .font(.subheadline.weight(.medium))
                    Picker(
                        "",
                        selection: Binding(
                            get: {
                                screenCaptureManager.visionUseFastRecognition
                            },
                            set: { (_: Bool) in
                                screenCaptureManager
                                    .toggleVisionRecognitionSpeed()
                            }
                        )
                    ) {
                        Text("Accurate").tag(false)
                        Text("Fast").tag(true)
                    }
                    .pickerStyle(.segmented)
                    Text(
                        screenCaptureManager.visionUseFastRecognition
                            ? "Faster, misses more text — good for latency testing."
                            : "Slower, catches significantly more text — default."
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Minimum Text Height")
                            .font(.subheadline.weight(.medium))
                        Spacer()
                        Text(
                            String(
                                format: "%.3f",
                                screenCaptureManager.visionMinimumTextHeight
                            )
                        )
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                    }
                    Slider(
                        value: Binding(
                            get: {
                                screenCaptureManager.visionMinimumTextHeight
                            },
                            set: {
                                screenCaptureManager.setVisionMinimumTextHeight(
                                    $0
                                )
                            }
                        ),
                        in: 0.004...0.05,
                        step: 0.002
                    )
                    Text(
                        "Lower catches smaller text but slows detection. Default 0.03125 misses most UI text; 0.008 is a good starting point."
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
            }
            .padding(20)
            .background(
                .quaternary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 20)
            )
        }
    }

    private var captureSourceSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Capture Source")
                .font(.headline)

            VStack(alignment: .leading, spacing: 12) {
                if screenCaptureManager.captureTargets.isEmpty {
                    Text(
                        "No capture sources found. Tap Refresh to load available displays and windows."
                    )
                    .foregroundStyle(.secondary)
                } else {
                    Picker(
                        "Source",
                        selection: Binding(
                            get: { screenCaptureManager.selectedTarget },
                            set: { target in
                                if let target {
                                    screenCaptureManager.selectTarget(target)
                                }
                            }
                        )
                    ) {
                        ForEach(screenCaptureManager.captureTargets) { target in
                            Text(target.displayName).tag(Optional(target))
                        }
                    }
                    .labelsHidden()
                }

                Button("Refresh Sources") {
                    screenCaptureManager.loadCaptureTargets()
                }
                .buttonStyle(.link)

                Divider()

                VStack(alignment: .leading, spacing: 6) {
                    Text("Crop Mode")
                        .font(.subheadline.weight(.medium))
                    Picker(
                        "Crop Mode",
                        selection: Binding(
                            get: { screenCaptureManager.cropMode },
                            set: { screenCaptureManager.setCropMode($0) }
                        )
                    ) {
                        Text("Full Source").tag(CropMode.none)
                        Text("16:9 Crop").tag(
                            CropMode.aspect(width: 16, height: 9)
                        )
                        Text("4:3 Crop").tag(
                            CropMode.aspect(width: 4, height: 3)
                        )
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                    if screenCaptureManager.cropMode != .none {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Horizontal Position")
                                .font(.subheadline.weight(.medium))
                            Picker(
                                "Horizontal Position",
                                selection: Binding(
                                    get: { screenCaptureManager.cropAlignment },
                                    set: {
                                        screenCaptureManager.setCropAlignment(
                                            $0
                                        )
                                    }
                                )
                            ) {
                                ForEach(CropAlignment.allCases, id: \.self) {
                                    alignment in
                                    Text(alignment.title).tag(alignment)
                                }
                            }
                            .pickerStyle(.segmented)
                            .labelsHidden()
                        }
                    }
                    Text(cropModeDescription)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                .quaternary.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 20)
            )
        }
    }

    private var cropModeDescription: String {
        switch screenCaptureManager.cropMode {
        case .none:
            return
                "Captures the full source. Ultrawide displays may still be letterboxed in the fixed 16:9 camera feed."
        case .aspect(let w, let h):
            if w * AppConfig.videoHeight == h * AppConfig.videoWidth {
                return
                    "Crops a \(w):\(h) region before Vision, then fills the 16:9 camera feed edge-to-edge."
            }
            return
                "Crops a \(w):\(h) region before Vision. Because the virtual camera stays 16:9, non-16:9 crops are centered with side bars."
        }
    }

    private var previewSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Preview")
                .font(.headline)

            SampleBufferPreviewView(layer: screenCaptureManager.previewLayer)
                .aspectRatio(16 / 9, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Validation Steps")
                .font(.headline)

            Text("1. Run NoDox from /Applications.")
            Text(
                "2. Install or reinstall the camera extension and approve it if macOS asks."
            )
            Text("3. Start screen capture and allow Screen Recording access.")
            Text(
                "4. Open OBS, QuickTime, or Photo Booth and confirm the NoDox camera shows the live display."
            )
            Text(
                "5. Add one or more regexes, enable sensitive-text redaction, and confirm matching text is covered with black bars in the preview."
            )
            Text(
                "6. Enable Vision debug boxes when needed to compare OCR detection rectangles against the redacted output."
            )
        }
        .foregroundStyle(.secondary)
    }

    private var redactionPatternStatus: String {
        let count = screenCaptureManager.redactionActivePatternCount
        let noun = count == 1 ? "pattern" : "patterns"
        return
            "\(count) active \(noun). Inline modifiers such as `(?i)` still work if you want case-insensitive matching."
    }

    private var redactionModeDescription: String {
        switch screenCaptureManager.redactionMode {
        case .live:
            return
                "Frames are output immediately with the latest cached OCR result. A newly visible sensitive string can slip through for one Vision cycle (~100ms) before it is redacted."
        case .delayed:
            return
                "Frames are held in chunks. Vision samples the last frame of each chunk and applies that result to the whole chunk before release. This lowers leak risk, but short-lived text that appears only between sampled frames can still be missed. If Vision falls behind, NoDox reuses the most recent sampled overlay instead of letting delay grow without bound."
        }
    }

    private var delayedRedactionDelayLabel: String {
        let seconds =
            Double(screenCaptureManager.delayedRedactionChunkSize)
            / Double(AppConfig.videoFrameRate)
        return String(format: "%.2f", seconds)
    }

    private func redactionPatternRow(_ index: Int) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                TextField(
                    "Enter regex pattern",
                    text: Binding(
                        get: {
                            guard
                                screenCaptureManager.redactionPatterns.indices
                                    .contains(index)
                            else { return "" }
                            return screenCaptureManager.redactionPatterns[index]
                        },
                        set: {
                            screenCaptureManager.setRedactionPattern(
                                $0,
                                at: index
                            )
                        }
                    )
                )
                .textFieldStyle(.roundedBorder)
                .font(.system(.body, design: .monospaced))

                Button(role: .destructive) {
                    screenCaptureManager.removeRedactionPattern(at: index)
                } label: {
                    Image(systemName: "minus.circle")
                }
                .buttonStyle(.plain)
            }

            if let error = redactionPatternError(at: index) {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
    }

    private func redactionPatternError(at index: Int) -> String? {
        screenCaptureManager.redactionPatternErrors.first(where: {
            $0.index == index
        })?.message
    }
}

#Preview {
    HomeView()
        .environmentObject(CameraExtensionActivationManager())
        .environmentObject(ScreenCaptureManager())
}
