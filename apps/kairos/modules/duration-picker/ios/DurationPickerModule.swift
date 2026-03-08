import ExpoModulesCore

public class DurationPickerModule: Module {
    public func definition() -> ModuleDefinition {
        Name("DurationPicker")

        View(DurationPickerView.self) {
            Events("onDurationChange")

            Prop("hours") { (view: DurationPickerView, value: Int) in
                view.hours = value
            }

            Prop("minutes") { (view: DurationPickerView, value: Int) in
                view.minutes = value
            }

            Prop("seconds") { (view: DurationPickerView, value: Int) in
                view.seconds = value
            }

            Prop("groupSpacing") { (view: DurationPickerView, value: Double) in
                view.groupSpacing = value
            }

            Prop("valueToUnitSpacing") {
                (view: DurationPickerView, value: Double) in
                view.valueToUnitSpacing = value
            }

            Prop("colorScheme") { (view: DurationPickerView, value: String) in
                view.colorScheme = value
            }
        }
    }
}
