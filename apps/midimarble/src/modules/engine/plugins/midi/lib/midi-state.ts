import { findFirstTrackWithNotes } from './timing';
import { parseMidi } from './midi-parser';
import type { TMidiApp } from '../types';

type TMidiStateAccess = {
	updateResource: TMidiApp['updateResource'];
};

export async function loadMidiFileIntoState(app: TMidiStateAccess, file: File): Promise<void> {
	try {
		const song = parseMidi(await file.arrayBuffer(), file.name);
		const selectedTrack = findFirstTrackWithNotes(song);

		app.updateResource('midiSong', song);
		app.updateResource('selectedTrackId', selectedTrack?.id ?? null);
		app.updateResource('midiImportError', null);
	} catch (error) {
		app.updateResource('midiSong', null);
		app.updateResource('selectedTrackId', null);
		app.updateResource(
			'midiImportError',
			error instanceof Error ? error.message : 'Failed to import MIDI file.'
		);
	}
}

export function clearMidiSongState(app: TMidiStateAccess): void {
	app.updateResource('midiSong', null);
	app.updateResource('selectedTrackId', null);
	app.updateResource('midiImportError', null);
}
