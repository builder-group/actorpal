import type { TMidiApp } from '../types';
import { parseMidi } from './midi-parser';
import { findFirstTrackWithNotes } from './timing';

type TMidiStateAccess = {
	r?: Pick<TMidiApp['r'], 'midiSong'>;
	updateResource: TMidiApp['updateResource'];
};

export async function loadMidiFileIntoState(app: TMidiStateAccess, file: File): Promise<void> {
	try {
		const song = parseMidi(await file.arrayBuffer(), file.name);
		const selectedTrack = findFirstTrackWithNotes(song);

		app.updateResource('midiSong', song);
		app.updateResource('selectedTrackId', selectedTrack?.id ?? null);
		app.updateResource('selectedNoteId', null);
		app.updateResource('midiImportError', null);
	} catch (error) {
		app.updateResource('midiSong', null);
		app.updateResource('selectedTrackId', null);
		app.updateResource('selectedNoteId', null);
		app.updateResource(
			'midiImportError',
			error instanceof Error ? error.message : 'Failed to import MIDI file.'
		);
	}
}

export function clearMidiSongState(app: TMidiStateAccess): void {
	app.updateResource('midiSong', null);
	app.updateResource('selectedTrackId', null);
	app.updateResource('selectedNoteId', null);
	app.updateResource('midiImportError', null);
}

export function selectMidiNote(app: TMidiStateAccess, noteId: number | null): void {
	if (noteId == null) {
		app.updateResource('selectedNoteId', null);
		return;
	}

	const song = app.r?.midiSong ?? null;
	const hasNote =
		song?.tracks.some((track) => track.notes.some((note) => note.id === noteId)) ?? true;
	app.updateResource('selectedNoteId', hasNote ? noteId : null);
}
