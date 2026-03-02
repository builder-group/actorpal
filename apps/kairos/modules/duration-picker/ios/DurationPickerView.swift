import ExpoModulesCore
import UIKit

final class DurationPickerView: ExpoView, UIPickerViewDataSource,
    UIPickerViewDelegate
{
    private enum Component: Int, CaseIterable {
        case hours = 0
        case minutes = 1
        case seconds = 2

        var maxValue: Int {
            switch self {
            case .hours:
                return 23
            case .minutes, .seconds:
                return 59
            }
        }

        var unitText: String {
            switch self {
            case .hours:
                return NSLocalizedString(
                    "duration_picker_unit_hours",
                    value: "hours",
                    comment: "Duration picker hours unit label"
                )
            case .minutes:
                return NSLocalizedString(
                    "duration_picker_unit_min",
                    value: "min",
                    comment: "Duration picker minutes unit label"
                )
            case .seconds:
                return NSLocalizedString(
                    "duration_picker_unit_sec",
                    value: "sec",
                    comment: "Duration picker seconds unit label"
                )
            }
        }
    }

    private enum Style {
        static let valueFont = UIFont.monospacedDigitSystemFont(
            ofSize: 23.5,
            weight: .regular
        )
        static let unitFont = UIFont.systemFont(ofSize: 17, weight: .semibold)
        static let rowHeight: CGFloat = 32
        static let columnSpacing: CGFloat = 5
        static let valueToUnitSpacing: CGFloat = 4
        static let unitVerticalAdjustment: CGFloat =
            UIScreen.main.scale == 2 ? 2 : 1
    }

    let onDurationChange = EventDispatcher()

    private let pickerView = UIPickerView()
    private let feedbackGenerator = UISelectionFeedbackGenerator()
    private let unitLabels: [Component: UILabel] = Dictionary(
        uniqueKeysWithValues: Component.allCases.map { component in
            (
                component,
                DurationPickerView.makeUnitLabel(text: component.unitText)
            )
        }
    )
    private var isApplyingExternalSelection = false
    private var _hours = 0
    private var _minutes = 0
    private var _seconds = 0
    private var _groupSpacing: CGFloat = 0

    var hours: Int {
        get { _hours }
        set { setValue(newValue, for: .hours, fromUser: false) }
    }

    var minutes: Int {
        get { _minutes }
        set { setValue(newValue, for: .minutes, fromUser: false) }
    }

    var seconds: Int {
        get { _seconds }
        set { setValue(newValue, for: .seconds, fromUser: false) }
    }

    var groupSpacing: Double {
        get { Double(_groupSpacing) }
        set {
            let clamped = CGFloat(min(max(newValue, 0), 20))
            guard _groupSpacing != clamped else {
                return
            }
            _groupSpacing = clamped
            pickerView.reloadAllComponents()
            setNeedsLayout()
        }
    }

    required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)
        setupPicker()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        positionUnitLabels()
    }

    private func setupPicker() {
        pickerView.translatesAutoresizingMaskIntoConstraints = false
        pickerView.dataSource = self
        pickerView.delegate = self

        addSubview(pickerView)
        Component.allCases.forEach { component in
            if let label = unitLabels[component] {
                addSubview(label)
            }
        }
        NSLayoutConstraint.activate([
            pickerView.leadingAnchor.constraint(equalTo: leadingAnchor),
            pickerView.trailingAnchor.constraint(equalTo: trailingAnchor),
            pickerView.topAnchor.constraint(equalTo: topAnchor),
            pickerView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        isApplyingExternalSelection = true
        Component.allCases.forEach { component in
            pickerView.selectRow(
                value(for: component),
                inComponent: component.rawValue,
                animated: false
            )
        }
        isApplyingExternalSelection = false
        feedbackGenerator.prepare()
    }

    private func setValue(
        _ newValue: Int,
        for component: Component,
        fromUser: Bool
    ) {
        let clamped = Self.clamp(newValue, within: 0...component.maxValue)
        guard clamped != value(for: component) else {
            return
        }

        setStoredValue(clamped, for: component)
        applySelectionIfNeeded(for: component)

        if fromUser {
            feedbackGenerator.selectionChanged()
            feedbackGenerator.prepare()
            emitChange()
        }
    }

    private func value(for component: Component) -> Int {
        switch component {
        case .hours:
            return _hours
        case .minutes:
            return _minutes
        case .seconds:
            return _seconds
        }
    }

    private func setStoredValue(_ value: Int, for component: Component) {
        switch component {
        case .hours:
            _hours = value
        case .minutes:
            _minutes = value
        case .seconds:
            _seconds = value
        }
    }

    private func applySelectionIfNeeded(for component: Component) {
        let currentValue = value(for: component)
        guard
            pickerView.selectedRow(inComponent: component.rawValue)
                != currentValue
        else {
            return
        }

        isApplyingExternalSelection = true
        pickerView.selectRow(
            currentValue,
            inComponent: component.rawValue,
            animated: false
        )
        isApplyingExternalSelection = false
    }

    private func emitChange() {
        let payload: [String: Int] = [
            "hours": _hours,
            "minutes": _minutes,
            "seconds": _seconds,
        ]
        onDurationChange(payload)
    }

    private static func makeUnitLabel(text: String) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = Style.unitFont
        label.textColor = .label
        label.isAccessibilityElement = false
        label.sizeToFit()
        return label
    }

    private func positionUnitLabels() {
        let numberOfColumns = CGFloat(Component.allCases.count)
        let rowWidth = componentWidth()
        let actualColumnSpacing = Style.columnSpacing
        let pickerWidth =
            numberOfColumns * rowWidth + (numberOfColumns - 1)
            * actualColumnSpacing
        let firstRowOriginX = (bounds.width - pickerWidth) / 2
        let rowY = bounds.midY + Style.unitVerticalAdjustment
        let numberWidth = numberTextWidth()
        let groupInsetX = groupInsetWithinComponent()

        Component.allCases.forEach { component in
            guard let label = unitLabels[component] else {
                return
            }
            label.sizeToFit()
            label.frame.origin = CGPoint(
                x: firstRowOriginX + CGFloat(component.rawValue)
                    * (rowWidth + actualColumnSpacing) + groupInsetX
                    + numberWidth
                    + Style.valueToUnitSpacing,
                y: rowY - label.frame.height / 2
            )
        }
    }

    private func numberTextWidth() -> CGFloat {
        let size = ("00" as NSString).size(withAttributes: [
            .font: Style.valueFont
        ])
        return ceil(size.width)
    }

    private func maxUnitLabelWidth() -> CGFloat {
        let widest =
            Component.allCases.compactMap { unitLabels[$0]?.bounds.width }.max()
            ?? 0
        return ceil(widest)
    }

    private func groupWidth() -> CGFloat {
        floor(
            numberTextWidth() + Style.valueToUnitSpacing + maxUnitLabelWidth()
        )
    }

    private func componentWidth() -> CGFloat {
        floor(groupWidth() + _groupSpacing)
    }

    private func groupInsetWithinComponent() -> CGFloat {
        max((componentWidth() - groupWidth()) / 2, 0)
    }

    private static func clamp(_ value: Int, within range: ClosedRange<Int>)
        -> Int
    {
        min(max(value, range.lowerBound), range.upperBound)
    }

    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        Component.allCases.count
    }

    func pickerView(
        _ pickerView: UIPickerView,
        numberOfRowsInComponent component: Int
    ) -> Int {
        guard let pickerComponent = Component(rawValue: component) else {
            return 0
        }
        return pickerComponent.maxValue + 1
    }

    func pickerView(
        _ pickerView: UIPickerView,
        widthForComponent component: Int
    ) -> CGFloat {
        componentWidth()
    }

    func pickerView(
        _ pickerView: UIPickerView,
        rowHeightForComponent component: Int
    ) -> CGFloat {
        Style.rowHeight
    }

    func pickerView(
        _ pickerView: UIPickerView,
        viewForRow row: Int,
        forComponent component: Int,
        reusing view: UIView?
    ) -> UIView {
        let contentView = (view as? NumberRowView) ?? NumberRowView()
        guard let pickerComponent = Component(rawValue: component) else {
            return contentView
        }

        let text = String(row)
        contentView.setText(
            text,
            font: Style.valueFont,
            numberWidth: numberTextWidth(),
            contentInsetX: groupInsetWithinComponent(),
            accessibilityLabel: "\(text) \(pickerComponent.unitText)"
        )
        return contentView
    }

    func pickerView(
        _ pickerView: UIPickerView,
        didSelectRow row: Int,
        inComponent component: Int
    ) {
        guard !isApplyingExternalSelection else {
            return
        }
        guard let pickerComponent = Component(rawValue: component) else {
            return
        }
        setValue(row, for: pickerComponent, fromUser: true)
    }
}

private final class NumberRowView: UIView {
    private let label = UILabel()
    private var numberWidth: CGFloat = 0
    private var contentInsetX: CGFloat = 0

    override init(frame: CGRect) {
        super.init(frame: frame)
        label.textAlignment = .right
        addSubview(label)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        label.textAlignment = .right
        addSubview(label)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        label.frame = CGRect(
            x: contentInsetX,
            y: 0,
            width: numberWidth,
            height: bounds.height
        )
    }

    func setText(
        _ text: String,
        font: UIFont,
        numberWidth: CGFloat,
        contentInsetX: CGFloat,
        accessibilityLabel: String
    ) {
        label.text = text
        label.font = font
        label.textColor = .label
        label.accessibilityLabel = accessibilityLabel
        self.numberWidth = numberWidth
        self.contentInsetX = contentInsetX
        setNeedsLayout()
    }
}
