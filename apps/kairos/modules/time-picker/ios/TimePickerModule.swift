import ExpoModulesCore
import ExpoUI

public class TimePickerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TimePicker")

    ExpoUIView(TimePickerView.self)
  }
}
