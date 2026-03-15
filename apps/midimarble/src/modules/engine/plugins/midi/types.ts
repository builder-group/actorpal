import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TEngineSystemSet } from '../../types';
import type { TMidiLookup } from './lib/midi-lookup';

export type TMidiPlugin = TPlugin<
	{
		name: 'Midi';
		resources: {
			midiSong: TMidiSong | null;
			midiLookup: TMidiLookup;
			selectedTrackId: number | null;
			selectedNoteId: number | null;
			selectedNoteIds: Set<number>;
			nextMidiNoteId: number;
			midiImportError: string | null;
		};
		appExtensions: {
			loadMidiFile(file: File): Promise<void>;
			clearMidiSong(): void;
			selectNote(noteId: number | null): void;
			selectNotes(noteIds: number[], primaryNoteId: number | null): void;
			selectAllTrackNotes(trackId?: number): void;
			clearNoteSelection(): void;
			createNote(input: TMidiCreateNoteInput): number | null;
			moveSelectedNotes(deltaTick: number, deltaNoteNumber: number): boolean;
			resizePrimarySelectedNote(edge: 'start' | 'end', deltaTick: number): boolean;
			deleteSelectedNotes(): number;
		};
		systemSets: TEngineSystemSet;
	},
	[TDefaultPlugin]
>;

export type TMidiApp = TApp<TAppContext<[TDefaultPlugin, TMidiPlugin]>>;

export interface TMidiNote {
	id: number;
	tick: number;
	durationTicks: number;
	noteNumber: number;
	velocity: number;
	channel: number;
}

export interface TMidiTrack {
	id: number;
	name: string;
	notes: TMidiNote[];
}

export interface TMidiSong {
	name: string;
	bpm: number;
	ticksPerBeat: number;
	totalTicks: number;
	tracks: TMidiTrack[];
}

export interface TMidiCreateNoteInput {
	trackId?: number;
	tick: number;
	durationTicks: number;
	noteNumber: number;
}
