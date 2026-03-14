import type { TVec3 } from '@/modules/engine';
import { tickToStep, type TMidiNote, type TMidiSong } from '@/modules/engine/plugins/midi';
import { getNoteName } from './timeline-layout';

export type TInspectorTarget =
	| TEmptyInspectorTarget
	| TNoteInspectorTarget
	| TStraightTrackInspectorTarget
	| TMarbleInspectorTarget;

export interface TEmptyInspectorTarget {
	kind: 'empty';
	message: string;
}

export interface TNoteInspectorTarget {
	kind: 'note';
	title: string;
	noteId: number;
	noteName: string;
	noteNumber: number;
	tick: number;
	step: number;
	durationTicks: number;
	velocity: number;
	channel: number;
	trackName: string;
	pathState: 'past' | 'future' | 'unresolved';
	position: TVec3 | null;
}

export interface TStraightTrackInspectorTarget {
	kind: 'straight-track';
	title: string;
	entityId: number;
	position: TVec3;
	rotation: TVec3;
	length: number;
	width: number;
	channelWidth: number;
	channelDepth: number;
	color: string;
}

export interface TMarbleInspectorTarget {
	kind: 'marble';
	title: string;
	entityId: number;
	position: TVec3;
	velocity: TVec3 | null;
}

export function buildNoteInspectorTarget(
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	trackName: string,
	note: TMidiNote,
	liveStep: number,
	bufferedStep: number,
	fixedTimeStepSeconds: number,
	position: TVec3 | null
): TNoteInspectorTarget {
	const step = tickToStep(note.tick, song, fixedTimeStepSeconds);
	return {
		kind: 'note',
		title: 'Selected Note',
		noteId: note.id,
		noteName: getNoteName(note.noteNumber),
		noteNumber: note.noteNumber,
		tick: note.tick,
		step,
		durationTicks: note.durationTicks,
		velocity: note.velocity,
		channel: note.channel,
		trackName,
		pathState:
			position == null
				? 'unresolved'
				: step <= liveStep
					? 'past'
					: step <= bufferedStep
						? 'future'
						: 'unresolved',
		position
	};
}

export function buildEmptyInspectorTarget(): TEmptyInspectorTarget {
	return {
		kind: 'empty',
		message: 'Select a note, straight track, or marble to inspect it.'
	};
}
