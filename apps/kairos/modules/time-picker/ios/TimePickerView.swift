import ExpoModulesCore
import ExpoUI
import SwiftUI

final class TimePickerViewProps: UIBaseViewProps {
  @Field var title: String = ""
}

struct TimePickerView: ExpoSwiftUI.View {
  @ObservedObject public var props: TimePickerViewProps

  var body: some View {
    VStack {
      Text(props.title)
        .font(.headline)
      Children()  // Renders React children
    }
  }
}
