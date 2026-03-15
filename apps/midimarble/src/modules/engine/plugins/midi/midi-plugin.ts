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
import type { TMidiApp, TMidiCreateNoteInput, TMidiPlugin } from './types';

export function createMidiPlugin(): TMidiPlugin {
	return {
		// Midi owns imported song data and the currently selected track.
		name: 'Midi',
		deps: ['Default'],
		resources: {
			midiSong: null,
			selectedTrackId: null,
			selectedNoteId: null,
			selectedNoteIds: new Set<number>(),
			nextMidiNoteId: 0,
			midiImportError: null
		},
		appExtensions: {
			async loadMidiFile(this: TMidiApp, file: File): Promise<void> {
				await loadMidiFileIntoState(this, file);
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
