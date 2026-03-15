import {
	clampMidiTick,
	findTrackById,
	getTicksPerSecond,
	getTrackNotesAtRoundedTick,
	getTrackNotesInTickRange,
	tickToSeconds,
	type TMidiLookup,
	type TMidiNote,
	type TMidiSong
} from '../../midi';

export const PLAYBACK_MAX_NOTE_SECONDS = 2.5;
export const PREVIEW_MAX_NOTE_SECONDS = 0.9;

export function getSelectedTrackNotesInRange(
	song: TMidiSong | null,
	midiLookup: TMidiLookup,
	selectedTrackId: number | null,
	startTick: number,
	endTick: number
): TMidiNote[] {
	if (song == null) {
		return [];
	}

	const track = findTrackById(song, selectedTrackId, midiLookup);
	return getTrackNotesInTickRange(midiLookup, selectedTrackId, startTick, endTick, track);
}

export function getSelectedTrackNotesAtTick(
	song: TMidiSong | null,
	midiLookup: TMidiLookup,
	selectedTrackId: number | null,
	tick: number
): TMidiNote[] {
	if (song == null) {
		return [];
	}

	const track = findTrackById(song, selectedTrackId, midiLookup);
	const roundedTick = Math.round(clampMidiTick(tick, song.totalTicks));
	return getTrackNotesAtRoundedTick(midiLookup, selectedTrackId, roundedTick, track);
}

export function midiNoteToFrequency(noteNumber: number): number {
	return 440 * Math.pow(2, (noteNumber - 69) / 12);
}

export function getNoteDurationSeconds(
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	note: Pick<TMidiNote, 'durationTicks'>,
	maxDurationSeconds: number
): number {
	return Math.min(tickToSeconds(note.durationTicks, song), maxDurationSeconds);
}

export function getPlaybackDelaySeconds(
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'>,
	noteTick: number,
	playheadTick: number
): number {
	const ticksPerSecond = getTicksPerSecond(song);
	if (ticksPerSecond <= 0) {
		return 0;
	}

	return Math.max(0, (noteTick - playheadTick) / ticksPerSecond);
}
