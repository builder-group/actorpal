import { buildMidiLookup, createEmptyMidiLookup } from './lib/midi-lookup';
import {
	clearMidiNoteSelection,
	clearMidiSongState,
	createMidiNote,
	deleteSelectedMidiNotes,
	loadMidiFileIntoState,
	moveSelectedMidiNotes,
	resizePrimarySelectedMidiNote,
	selectAllTrackMidiNotes,
	selectMidiNote,
	selectMidiNotes
} from './lib/midi-state';
import type { TMidiApp, TMidiCreateNoteInput, TMidiPlugin, TMidiSong } from './types';

export function createMidiPlugin(options?: {
	song?: TMidiSong | null;
	selectedTrackId?: number | null;
}): TMidiPlugin {
	const song = options?.song ?? null;
	const selectedTrackId = options?.selectedTrackId ?? null;
	const nextMidiNoteId =
		song != null
			? song.tracks.reduce((maxId, track) => Math.max(maxId, ...track.notes.map((n) => n.id)), -1) +
				1
			: 0;

	return {
		// Midi owns imported song data and the currently selected track.
		name: 'Midi',
		deps: ['Default'],
		resources: {
			midiSong: song,
			midiLookup: song != null ? buildMidiLookup(song) : createEmptyMidiLookup(),
			selectedTrackId,
			selectedNoteId: null,
			selectedNoteIds: new Set<number>(),
			nextMidiNoteId,
			midiImportError: null
		},
		appExtensions: {
			async loadMidiFile(this: TMidiApp, file: File): Promise<void> {
				await loadMidiFileIntoState(this, file);
			},
			loadMidiSongDirect(this: TMidiApp, song: TMidiSong, selectedTrackId: number | null): void {
				const nextMidiNoteId =
					song.tracks.reduce(
						(maxId, track) => Math.max(maxId, ...track.notes.map((n) => n.id)),
						-1
					) + 1;
				this.updateResource('midiSong', song);
				this.updateResource('midiLookup', buildMidiLookup(song));
				this.updateResource('selectedTrackId', selectedTrackId);
				this.updateResource('selectedNoteId', null);
				this.updateResource('selectedNoteIds', new Set<number>());
				this.updateResource('nextMidiNoteId', nextMidiNoteId);
				this.updateResource('midiImportError', null);
			},
			clearMidiSong(this: TMidiApp): void {
				clearMidiSongState(this);
			},
			selectNote(this: TMidiApp, noteId: number | null): void {
				selectMidiNote(this, noteId);
			},
			selectNotes(this: TMidiApp, noteIds: number[], primaryNoteId: number | null): void {
				selectMidiNotes(this, noteIds, primaryNoteId);
			},
			selectAllTrackNotes(this: TMidiApp, trackId?: number): void {
				selectAllTrackMidiNotes(this, trackId);
			},
			clearNoteSelection(this: TMidiApp): void {
				clearMidiNoteSelection(this);
			},
			createNote(this: TMidiApp, input: TMidiCreateNoteInput) {
				return createMidiNote(this, input);
			},
			moveSelectedNotes(this: TMidiApp, deltaTick: number, deltaNoteNumber: number): boolean {
				return moveSelectedMidiNotes(this, deltaTick, deltaNoteNumber);
			},
			resizePrimarySelectedNote(this: TMidiApp, edge: 'start' | 'end', deltaTick: number): boolean {
				return resizePrimarySelectedMidiNote(this, edge, deltaTick);
			},
			deleteSelectedNotes(this: TMidiApp): number {
				return deleteSelectedMidiNotes(this);
			}
		}
	};
}
