//
//  Font+Erode.swift
//  Derive
//
//  Created by Benno on 06.01.26.
//

import SwiftUI
import UIKit

extension Font {
    static func erode(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Erode Variable", size: size).weight(weight)
    }
}

extension UIFont {
    static func erode(_ size: CGFloat, weight: UIFont.Weight = .regular) -> UIFont {
        let descriptor = UIFontDescriptor(fontAttributes: [
            .name: "Erode Variable",
            .traits: [UIFontDescriptor.TraitKey.weight: weight]
        ])
        return UIFont(descriptor: descriptor, size: size)
    }
}
