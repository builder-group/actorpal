import { requireNativeModule } from 'expo-modules-core';

const AudioModule = requireNativeModule('Audio');

/** Play a sound by name. Searches system sound paths first, then the app bundle. */
export async function play(soundName: string): Promise<void> {
	return AudioModule.play(soundName);
}

export function stop(): void {
	AudioModule.stop();
}

export async function getSystemSounds(): Promise<string[]> {
	return AudioModule.getSystemSounds();
}
