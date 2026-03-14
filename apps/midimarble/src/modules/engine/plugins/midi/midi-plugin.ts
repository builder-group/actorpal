import { clearMidiSongState, loadMidiFileIntoState } from './lib/midi-state';
import type { TMidiApp, TMidiPlugin } from './types';

export function createMidiPlugin(): TMidiPlugin {
	return {
		// Midi owns imported song data and the currently selected track.
		name: 'Midi',
		deps: ['Default'],
		resources: {
			midiSong: null,
			selectedTrackId: null,
			midiImportError: null
		},
		appExtensions: {
			async loadMidiFile(this: TMidiApp, file: File): Promise<void> {
				await loadMidiFileIntoState(this, file);
			},
			clearMidiSong(this: TMidiApp): void {
				clearMidiSongState(this);
			}
		}
	};
}
