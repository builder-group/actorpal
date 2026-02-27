//
//  MeowSoundPlayer.swift
//  Keyboard
//
//  Created by Benno on 26.11.25.
//

import AVFoundation

/// Shared utility for playing meow sound.
class MeowSoundPlayer {
    static let shared = MeowSoundPlayer()
    private var audioPlayer: AVAudioPlayer?
    
    private init() {}
    
    func play() {
        // Try to load meow sound from bundle
        guard let soundURL = Bundle.main.url(forResource: "meow", withExtension: "mp3") ??
                             Bundle.main.url(forResource: "meow", withExtension: "wav") ??
                             Bundle.main.url(forResource: "meow", withExtension: "m4a") else {
            return
        }
        
        do {
            // Create audio player
            audioPlayer = try AVAudioPlayer(contentsOf: soundURL)
            audioPlayer?.prepareToPlay()
            
            // Play sound asynchronously
            audioPlayer?.play()
        } catch {
            print("Failed to play meow sound: \(error)")
        }
    }
}

