import type { TMidiNote, TMidiSong, TMidiTrack } from '../types';

export interface TMidiLookup {
	tracksById: Map<number, TMidiTrackLookup>;
	noteById: Map<number, TMidiNoteMatch>;
}

export interface TMidiTrackLookup {
	track: TMidiTrack;
	noteIds: Set<number>;
	maxDurationTicks: number;
}

export interface TMidiNoteMatch {
	note: TMidiNote;
	track: TMidiTrack;
}

export function createEmptyMidiLookup(): TMidiLookup {
	return {
		tracksById: new Map(),
		noteById: new Map()
	};
}

export function buildMidiLookup(song: TMidiSong | null): TMidiLookup {
	if (song == null) {
		return createEmptyMidiLookup();
	}

	const tracksById = new Map<number, TMidiTrackLookup>();
	const noteById = new Map<number, TMidiNoteMatch>();

	for (const track of song.tracks) {
		const trackLookup = buildTrackLookup(track);
		for (const note of track.notes) {
			noteById.set(note.id, { note, track });
		}
		tracksById.set(track.id, trackLookup);
	}

	return {
		tracksById,
		noteById
	};
}

export function getTrackLookup(
	midiLookup: TMidiLookup | null | undefined,
	trackId: number | null,
	fallbackTrack?: TMidiTrack | null
): TMidiTrackLookup | null {
	if (trackId == null) {
		return null;
	}

	return (
		midiLookup?.tracksById.get(trackId) ??
		(fallbackTrack == null ? null : buildTrackLookup(fallbackTrack))
	);
}

export function getTrackNotesInTickRange(
	midiLookup: TMidiLookup | null | undefined,
	trackId: number | null,
	startTickExclusive: number,
	endTickInclusive: number,
	fallbackTrack?: TMidiTrack | null
): TMidiNote[] {
	const trackLookup = getTrackLookup(midiLookup, trackId, fallbackTrack);
	if (trackLookup == null || endTickInclusive <= startTickExclusive) {
		return [];
	}

	const notes = trackLookup.track.notes;
	const startIndex = upperBoundByTick(notes, startTickExclusive);
	const matches: TMidiNote[] = [];

	for (let index = startIndex; index < notes.length; index += 1) {
		const note = notes[index];
		if (note == null || note.tick > endTickInclusive) {
			break;
		}
		matches.push(note);
	}

	return matches;
}

export function getTrackNotesAtRoundedTick(
	midiLookup: TMidiLookup | null | undefined,
	trackId: number | null,
	tick: number,
	fallbackTrack?: TMidiTrack | null
): TMidiNote[] {
	const trackLookup = getTrackLookup(midiLookup, trackId, fallbackTrack);
	if (trackLookup == null) {
		return [];
	}

	const roundedTick = Math.round(tick);
	const notes = trackLookup.track.notes;
	const startIndex = lowerBoundByTick(notes, roundedTick);
	const matches: TMidiNote[] = [];

	for (let index = startIndex; index < notes.length; index += 1) {
		const note = notes[index];
		if (note == null || note.tick !== roundedTick) {
			break;
		}
		matches.push(note);
	}

	return matches;
}

export function getTrackNotesOverlappingTickWindow(
	midiLookup: TMidiLookup | null | undefined,
	trackId: number | null,
	startTickInclusive: number,
	endTickExclusive: number,
	fallbackTrack?: TMidiTrack | null
): TMidiNote[] {
	const trackLookup = getTrackLookup(midiLookup, trackId, fallbackTrack);
	if (trackLookup == null || endTickExclusive <= startTickInclusive) {
		return [];
	}

	const notes = trackLookup.track.notes;
	const startTick = Math.max(0, startTickInclusive - trackLookup.maxDurationTicks);
	const startIndex = lowerBoundByTick(notes, startTick);
	const matches: TMidiNote[] = [];

	for (let index = startIndex; index < notes.length; index += 1) {
		const note = notes[index];
		if (note == null || note.tick >= endTickExclusive) {
			break;
		}
		if (note.tick + note.durationTicks > startTickInclusive) {
			matches.push(note);
		}
	}

	return matches;
}

function buildTrackLookup(track: TMidiTrack): TMidiTrackLookup {
	let maxDurationTicks = 0;
	const noteIds = new Set<number>();

	for (const note of track.notes) {
		noteIds.add(note.id);
		if (note.durationTicks > maxDurationTicks) {
			maxDurationTicks = note.durationTicks;
		}
	}

	return {
		track,
		noteIds,
		maxDurationTicks
	};
}

function lowerBoundByTick(notes: readonly TMidiNote[], tick: number): number {
	let low = 0;
	let high = notes.length;

	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		if ((notes[mid]?.tick ?? 0) < tick) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}

	return low;
}

function upperBoundByTick(notes: readonly TMidiNote[], tick: number): number {
	let low = 0;
	let high = notes.length;

	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		if ((notes[mid]?.tick ?? 0) <= tick) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}

	return low;
}
