Pod::Spec.new do |s|
  s.name           = 'DurationPicker'
  s.version        = '1.0.0'
  s.summary        = 'Native iOS duration picker view for Expo/React Native.'
  s.description    = 'A UIPickerView-based duration picker module exposing hours, minutes, and seconds to React Native via Expo modules.'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.license        = 'MIT'
  s.authors        = ''
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
