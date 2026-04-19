import AppKit
import SwiftRs

@_cdecl("nodox_macos_apply_window_liquid_glass")
public func nodoxMacosApplyWindowLiquidGlass(windowPtr: Int) -> Bool {
    return WindowLiquidGlass.apply(windowPtr: windowPtr)
}

@_cdecl("nodox_macos_greet")
public func nodoxMacosGreet(name: SRString) -> SRString? {
    return SRString("Hello, \(name.toString())! You've been greeted from Swift!")
}
