//
//  MeowActionHandler.swift
//  Keyboard
//
//  Created by Benno on 26.11.25.
//

import KeyboardKit
import AVFoundation

/// Custom action handler that plays a meow sound instead of the default click sound.
class MeowActionHandler: KeyboardAction.StandardActionHandler {
    
    override func tryTriggerAudioFeedback(for gesture: Keyboard.Gesture, on action: KeyboardAction) {
        let storage = SharedStorage.shared
        let catPosition = storage.catPosition
        
        // Play meow sound only if:
        // 1. Sound is enabled
        // 2. Cat is on space bar AND space key is pressed
        // 3. Cat is on enter bar AND enter/primary key is pressed
        let shouldPlayMeow = storage.soundEnabled &&
                             ((action == KeyboardAction.space && catPosition == .spaceBar) ||
                              (action.isPrimaryAction && catPosition == .enterBar))
        
        if shouldPlayMeow {
            MeowSoundPlayer.shared.play()
        } else {
            // Use standard feedback for all other actions (or when sound is disabled)
            super.tryTriggerAudioFeedback(for: gesture, on: action)
        }
    }
}

