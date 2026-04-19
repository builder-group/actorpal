//
//  main.swift
//  Camera Extension
//
//  Created by Benno on 19.04.26.
//

import Foundation
import CoreMediaIO

let providerSource = Camera_ExtensionProviderSource(clientQueue: nil)
CMIOExtensionProvider.startService(provider: providerSource.provider)

CFRunLoopRun()
