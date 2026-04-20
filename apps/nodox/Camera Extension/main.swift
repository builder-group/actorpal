//
//  main.swift
//  Camera Extension
//
//  Created by Benno on 19.04.26.
//

import CoreMediaIO
import Foundation

let providerSource = CameraExtensionProviderSource(clientQueue: nil)
CMIOExtensionProvider.startService(provider: providerSource.provider)

CFRunLoopRun()
