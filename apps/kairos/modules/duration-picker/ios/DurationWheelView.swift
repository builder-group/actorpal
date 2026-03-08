import SwiftUI
import UIKit

// Note: We use a custom UIPickerView implementation here
// because UIPickerView renders one continuous selection indicator across all columns,
// matching the iOS Timer app.
// SwiftUI's Picker(.wheel) draws one per column and can't be styled to span them all.

final class DurationWheelView: UIView, UIPickerViewDataSource,
    UIPickerViewDelegate
{

    private static let maxValues: [Int] = [23, 59, 59]
    private static let valueFont = UIFont.monospacedDigitSystemFont(
        ofSize: 23.5,
        weight: .regular
    )
    private static let unitFont = UIFont.systemFont(
        ofSize: 17,
        weight: .semibold
    )
    private static let rowHeight: CGFloat = 32
    // UIPickerView adds ~5pt between columns; value is empirically determined.
    private static let columnGap: CGFloat = 5

    var onChange: ((Int, Int, Int) -> Void)?

    // groupSpacing is mutable so ExpoView can update it via React Native props.
    var groupSpacing: CGFloat {
        didSet {
            guard oldValue != groupSpacing else { return }
            picker.reloadAllComponents()
            setNeedsLayout()
        }
    }

    // valueToUnitSpacing is mutable so ExpoView can update it via React Native props.
    var valueToUnitSpacing: CGFloat {
        didSet {
            guard oldValue != valueToUnitSpacing else { return }
            picker.reloadAllComponents()
            setNeedsLayout()
        }
    }

    private let picker = UIPickerView()
    private let units: [String]
    private let unitLabels: [UILabel]
    private let numberWidth: CGFloat
    private let maxUnitWidth: CGFloat
    private var selection = [0, 0, 0]
    private var isProgrammaticSelect = false

    // columnWidth is computed so it picks up spacing changes automatically.
    private var columnWidth: CGFloat {
        floor(numberWidth + valueToUnitSpacing + maxUnitWidth + groupSpacing)
    }

    init(
        groupSpacing: CGFloat = 12,
        valueToUnitSpacing: CGFloat = 4,
        units: [String] = ["hours", "min", "sec"],
        onChange: ((Int, Int, Int) -> Void)? = nil
    ) {
        self.groupSpacing = groupSpacing
        self.valueToUnitSpacing = valueToUnitSpacing
        self.onChange = onChange
        self.units = units

        let numW = ceil(
            ("00" as NSString).size(withAttributes: [.font: Self.valueFont])
                .width
        )
        let unitW = ceil(
            units.map {
                ($0 as NSString).size(withAttributes: [.font: Self.unitFont])
                    .width
            }.max() ?? 0
        )
        self.numberWidth = numW
        self.maxUnitWidth = unitW

        self.unitLabels = units.map {
            let label = UILabel()
            label.text = $0
            label.font = Self.unitFont
            label.textColor = .label
            // Row views carry the accessibility info; unit labels are visual only.
            label.isAccessibilityElement = false
            label.sizeToFit()
            return label
        }

        super.init(frame: .zero)

        picker.translatesAutoresizingMaskIntoConstraints = false
        picker.dataSource = self
        picker.delegate = self
        addSubview(picker)
        unitLabels.forEach { addSubview($0) }
        NSLayoutConstraint.activate([
            picker.topAnchor.constraint(equalTo: topAnchor),
            picker.bottomAnchor.constraint(equalTo: bottomAnchor),
            picker.leadingAnchor.constraint(equalTo: leadingAnchor),
            picker.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not supported") }

    override func layoutSubviews() {
        super.layoutSubviews()
        let startX = (bounds.width - 3 * columnWidth - 2 * Self.columnGap) / 2
        let midY = bounds.midY
        for (i, label) in unitLabels.enumerated() {
            let colX = startX + CGFloat(i) * (columnWidth + Self.columnGap)
            let unitX =
                colX + groupSpacing / 2 + numberWidth + valueToUnitSpacing
            label.frame.origin = CGPoint(
                x: (unitX * UIScreen.main.scale).rounded(.up)
                    / UIScreen.main.scale,
                y: midY - label.frame.height / 2
            )
        }
    }

    func setSelection(hours: Int, minutes: Int, seconds: Int) {
        for (i, v) in [hours, minutes, seconds].enumerated() {
            let clamped = max(0, min(v, Self.maxValues[i]))
            guard clamped != selection[i] else { continue }
            selection[i] = clamped
            if picker.selectedRow(inComponent: i) != clamped {
                isProgrammaticSelect = true
                picker.selectRow(clamped, inComponent: i, animated: false)
                isProgrammaticSelect = false
            }
        }
    }

    // MARK: UIPickerViewDataSource

    func numberOfComponents(in pickerView: UIPickerView) -> Int { 3 }

    func pickerView(
        _ pickerView: UIPickerView,
        numberOfRowsInComponent component: Int
    ) -> Int {
        Self.maxValues[component] + 1
    }

    // MARK: UIPickerViewDelegate

    func pickerView(
        _ pickerView: UIPickerView,
        widthForComponent component: Int
    ) -> CGFloat { columnWidth }
    func pickerView(
        _ pickerView: UIPickerView,
        rowHeightForComponent component: Int
    ) -> CGFloat { Self.rowHeight }

    func pickerView(
        _ pickerView: UIPickerView,
        viewForRow row: Int,
        forComponent component: Int,
        reusing view: UIView?
    ) -> UIView {
        // Full-width RowView so UIPickerView doesn't center the number label,
        // keeping it aligned with the static unit label overlay.
        let rowView = (view as? RowView) ?? RowView(font: Self.valueFont)
        rowView.frame = CGRect(
            x: 0,
            y: 0,
            width: columnWidth,
            height: Self.rowHeight
        )
        rowView.label.frame = CGRect(
            x: groupSpacing / 2,
            y: 0,
            width: numberWidth,
            height: Self.rowHeight
        )
        rowView.label.text = String(row)
        rowView.accessibilityLabel = "\(row) \(units[component])"
        return rowView
    }

    func pickerView(
        _ pickerView: UIPickerView,
        didSelectRow row: Int,
        inComponent component: Int
    ) {
        guard !isProgrammaticSelect else { return }
        selection[component] = row
        onChange?(selection[0], selection[1], selection[2])
    }
}

private final class RowView: UIView {
    let label = UILabel()
    init(font: UIFont) {
        super.init(frame: .zero)
        label.font = font
        label.textColor = .label
        label.textAlignment = .right
        addSubview(label)
    }
    required init?(coder: NSCoder) { fatalError() }
}

// MARK: - SwiftUI Wrapper
//
// Xcode Preview doesn't seem to work with ExpoView,
// so UI changes are developed here first using the #Preview below.
// DurationPickerView (the React Native module) wraps DurationWheelView from this file.

struct DurationPickerSwiftUI: UIViewRepresentable {
    @Binding var hours: Int
    @Binding var minutes: Int
    @Binding var seconds: Int
    /// Spacing between the three [value unit] groups.
    var groupSpacing: CGFloat = 12
    /// Spacing between the number and unit label within each group.
    var valueToUnitSpacing: CGFloat = 4

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    // Spacing is passed at creation and baked into the UIKit view's layout.
    // updateUIView only syncs the selected values, not the spacing.
    func makeUIView(context: Context) -> DurationWheelView {
        DurationWheelView(
            groupSpacing: groupSpacing,
            valueToUnitSpacing: valueToUnitSpacing,
            onChange: { [weak c = context.coordinator] h, m, s in
                c?.update(h, m, s)
            }
        )
    }

    func updateUIView(_ uiView: DurationWheelView, context: Context) {
        uiView.setSelection(hours: hours, minutes: minutes, seconds: seconds)
    }

    final class Coordinator {
        var parent: DurationPickerSwiftUI
        init(parent: DurationPickerSwiftUI) { self.parent = parent }
        func update(_ h: Int, _ m: Int, _ s: Int) {
            parent.hours = h
            parent.minutes = m
            parent.seconds = s
        }
    }
}

// MARK: - Preview

private struct DurationPickerPreviewHost: View {
    @State private var hours = 0
    @State private var minutes = 6
    @State private var seconds = 0

    var body: some View {
        VStack(spacing: 20) {
            DurationPickerSwiftUI(
                hours: $hours,
                minutes: $minutes,
                seconds: $seconds
            )
            .frame(height: 220)
            Text("\(hours)h \(minutes)m \(seconds)s")
                .font(.headline.monospacedDigit())
        }
        .padding()
        .preferredColorScheme(.dark)
    }
}

#Preview("Duration Picker") {
    DurationPickerPreviewHost()
}
