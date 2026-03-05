Pod::Spec.new do |s|
  s.name           = 'Audio'
  s.version        = '1.0.0'
  s.summary        = 'Native iOS audio module for Expo/React Native.'
  s.description    = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.frameworks = 'AVFoundation'
end
