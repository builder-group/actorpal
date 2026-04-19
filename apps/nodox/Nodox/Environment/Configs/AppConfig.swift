//
//  AppConfig.swift
//  Nodox
//
//  Created by Benno on 19.04.26.
//

import Foundation
import Security

enum AppConfig {
    static let appGroupBaseIdentifier = "com.buildergroup.nodox"
    static let cameraExtensionIdentifier = "com.buildergroup.nodox.camera-extension"

    static var appGroupIdentifier: String {
        guard let teamIdentifierPrefix else {
            return appGroupBaseIdentifier
        }

        return "\(teamIdentifierPrefix)\(appGroupBaseIdentifier)"
    }

    private static var teamIdentifierPrefix: String? {
        let entitlementKey = "com.apple.application-identifier" as CFString
        guard
            let task = SecTaskCreateFromSelf(nil),
            let value = SecTaskCopyValueForEntitlement(task, entitlementKey, nil) as? String,
            let separatorIndex = value.firstIndex(of: ".")
        else {
            return nil
        }

        return String(value[..<separatorIndex]) + "."
    }
}
