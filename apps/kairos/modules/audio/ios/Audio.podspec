Pod::Spec.new do |s|
  s.name           = 'Audio'
  s.version        = '1.0.0'
  s.summary        = 'Native iOS audio module for Expo/React Native.'
  s.description    = 'Local Expo module that exposes native iOS system sound playback to React Native.'
  s.author         = '@bennobuilder'
  s.license        = { :type => 'AGPL-3.0-or-later' }
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.frameworks = 'AVFoundation'
end
