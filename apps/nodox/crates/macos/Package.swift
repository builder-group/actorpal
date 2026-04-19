// swift-tools-version: 6.1

import Foundation
import PackageDescription

let package = Package(
    name: "nodox-macos",
    platforms: [
        .macOS(.v10_15)
    ],
    products: [
        .library(
            name: "nodox-macos",
            type: .static,
            targets: ["nodox-macos"]
        )
    ],
    dependencies: [
        .package(
            url: "https://github.com/brendonovich/swift-rs",
            exact: "1.0.7"
        )
    ],
    targets: [
        .target(
            name: "nodox-macos",
            dependencies: [
                .product(name: "SwiftRs", package: "swift-rs")
            ],
            path: "src-swift",
            swiftSettings: ProcessInfo.processInfo.environment["APP_STORE"]
                != nil ? [.define("APP_STORE")] : []
        )
    ]
)
