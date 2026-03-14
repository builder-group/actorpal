import type { TVec3 } from '@/modules/engine';
import { tickToStep, type TMidiNote, type TMidiSong } from '@/modules/engine/plugins/midi';
import { getNoteName } from './timeline-layout';

export type TInspectorTarget =
	| TEmptyInspectorTarget
	| TNoteInspectorTarget
	| TNotePlatformInspectorTarget
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
	notePlatformEntityId: number | null;
}

export interface TNotePlatformInspectorTarget {
	kind: 'note-platform';
	title: string;
	entityId: number;
	noteId: number;
	noteName: string;
	tick: number;
	step: number;
	pathState: 'past' | 'future' | 'unresolved';
	position: TVec3 | null;
	rotationX: number;
	length: number;
	width: number;
	thickness: number;
	bounce: number;
	color: string;
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
	bounce: number;
}

export function buildNoteInspectorTarget(
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	trackName: string,
	note: TMidiNote,
	liveStep: number,
	bufferedStep: number,
	fixedTimeStepSeconds: number,
	position: TVec3 | null,
	notePlatformEntityId: number | null
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
		position,
		notePlatformEntityId
	};
}

export function buildNotePlatformInspectorTarget(
	trackName: string,
	note: TMidiNote,
	entityId: number,
	step: number,
	pathState: 'past' | 'future' | 'unresolved',
	position: TVec3 | null,
	platform: {
		rotationX: number;
		length: number;
		width: number;
		thickness: number;
		bounce: number;
		color: string;
	}
): TNotePlatformInspectorTarget {
	return {
		kind: 'note-platform',
		title: 'Note Platform',
		entityId,
		noteId: note.id,
		noteName: `${getNoteName(note.noteNumber)} · ${trackName}`,
		tick: note.tick,
		step,
		pathState,
		position,
		rotationX: platform.rotationX,
		length: platform.length,
		width: platform.width,
		thickness: platform.thickness,
		bounce: platform.bounce,
		color: platform.color
	};
}

export function buildEmptyInspectorTarget(): TEmptyInspectorTarget {
	return {
		kind: 'empty',
		message: 'Select a note, straight track, or marble to inspect it.'
	};
}
