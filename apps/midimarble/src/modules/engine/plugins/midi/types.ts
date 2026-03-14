import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TEngineSystemSet } from '../../types';

export type TMidiPlugin = TPlugin<
		{
			name: 'Midi';
			resources: {
				midiSong: TMidiSong | null;
				selectedTrackId: number | null;
				selectedNoteId: number | null;
				midiImportError: string | null;
			};
			appExtensions: {
				loadMidiFile(file: File): Promise<void>;
				clearMidiSong(): void;
				selectNote(noteId: number | null): void;
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
