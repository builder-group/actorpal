import ExpoModulesCore
import UIKit

final class DurationPickerView: ExpoView {

    let onDurationChange = EventDispatcher()

    private let haptics = UISelectionFeedbackGenerator()
    private let picker: DurationWheelView
    private var h = 0, m = 0, s = 0

    required init(appContext: AppContext? = nil) {
        picker = DurationWheelView(units: [
            NSLocalizedString(
                "duration_picker_unit_hours",
                value: "hours",
                comment: "Duration picker hours unit"
            ),
            NSLocalizedString(
                "duration_picker_unit_min",
                value: "min",
                comment: "Duration picker minutes unit"
            ),
            NSLocalizedString(
                "duration_picker_unit_sec",
                value: "sec",
                comment: "Duration picker seconds unit"
            ),
        ])
        super.init(appContext: appContext)

        picker.onChange = { [weak self] h, m, s in
            guard let self else { return }
            self.h = h
            self.m = m
            self.s = s
            haptics.selectionChanged()
            haptics.prepare()
            onDurationChange(["hours": h, "minutes": m, "seconds": s])
        }

        picker.translatesAutoresizingMaskIntoConstraints = false
        addSubview(picker)
        NSLayoutConstraint.activate([
            picker.topAnchor.constraint(equalTo: topAnchor),
            picker.bottomAnchor.constraint(equalTo: bottomAnchor),
            picker.leadingAnchor.constraint(equalTo: leadingAnchor),
            picker.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])
        haptics.prepare()
    }

    var hours: Int {
        get { h }
        set {
            h = newValue
            picker.setSelection(hours: h, minutes: m, seconds: s)
        }
    }

    var minutes: Int {
        get { m }
        set {
            m = newValue
            picker.setSelection(hours: h, minutes: m, seconds: s)
        }
    }

    var seconds: Int {
        get { s }
        set {
            s = newValue
            picker.setSelection(hours: h, minutes: m, seconds: s)
        }
    }

    var groupSpacing: Double {
        get { Double(picker.groupSpacing) }
        set { picker.groupSpacing = CGFloat(max(0, min(newValue, 20))) }
    }
}
