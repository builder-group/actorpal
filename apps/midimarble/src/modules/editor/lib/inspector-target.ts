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
	position: TVec3 | null;
	offsetY: number;
	offsetZ: number;
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
	bounce: number;
}

export type TInspectorPathState = 'past' | 'future' | 'unresolved';

export function buildNoteInspectorTarget(
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	trackName: string,
	note: TMidiNote,
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
		position,
		notePlatformEntityId
	};
}

export function buildNotePlatformInspectorTarget(
	trackName: string,
	note: TMidiNote,
	entityId: number,
	step: number,
	position: TVec3 | null,
	platform: {
		offsetY: number;
		offsetZ: number;
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
		position,
		offsetY: platform.offsetY,
		offsetZ: platform.offsetZ,
		rotationX: platform.rotationX,
		length: platform.length,
		width: platform.width,
		thickness: platform.thickness,
		bounce: platform.bounce,
		color: platform.color
	};
}

export function buildStraightTrackInspectorTarget(
	entityId: number,
	track: {
		position: TVec3;
		rotation: TVec3;
		length: number;
		width: number;
		channelWidth: number;
		channelDepth: number;
		color: string;
	}
): TStraightTrackInspectorTarget {
	return {
		kind: 'straight-track',
		title: 'Straight Track',
		entityId,
		position: track.position,
		rotation: track.rotation,
		length: track.length,
		width: track.width,
		channelWidth: track.channelWidth,
		channelDepth: track.channelDepth,
		color: track.color
	};
}

export function buildEmptyInspectorTarget(): TEmptyInspectorTarget {
	return {
		kind: 'empty',
		message: 'Select a note, straight track, or marble to inspect it.'
	};
}

export function deriveInspectorPathState(
	step: number,
	position: TVec3 | null,
	liveStep: number,
	bufferedStep: number
): TInspectorPathState {
	if (position == null) {
		return 'unresolved';
	}
	if (step <= liveStep) {
		return 'past';
	}
	if (step <= bufferedStep) {
		return 'future';
	}
	return 'unresolved';
}
