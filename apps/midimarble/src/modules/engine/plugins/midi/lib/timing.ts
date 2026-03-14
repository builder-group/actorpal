import type { TMidiSong, TMidiTrack } from '../types';

export function getSongMaxTick(song: TMidiSong | null): number {
	return song?.totalTicks ?? 0;
}

export function clampMidiTick(tick: number, maxTick: number): number {
	if (!Number.isFinite(tick)) {
		return 0;
	}

	return Math.max(0, Math.min(tick, maxTick));
}

export function getTicksPerSecond(song: Pick<TMidiSong, 'ticksPerBeat' | 'bpm'>): number {
	return (song.ticksPerBeat * song.bpm) / 60;
}

export function tickToSeconds(tick: number, song: Pick<TMidiSong, 'ticksPerBeat' | 'bpm'>): number {
	const ticksPerSecond = getTicksPerSecond(song);
	if (ticksPerSecond <= 0) {
		return 0;
	}

	return Math.max(0, tick) / ticksPerSecond;
}

export function tickToStep(
	tick: number,
	song: Pick<TMidiSong, 'ticksPerBeat' | 'bpm'>,
	fixedTimeStepSeconds: number
): number {
	if (fixedTimeStepSeconds <= 0) {
		return 0;
	}

	return Math.max(0, Math.floor(tickToSeconds(tick, song) / fixedTimeStepSeconds));
}

export function stepToTick(
	step: number,
	song: Pick<TMidiSong, 'ticksPerBeat' | 'bpm'>,
	fixedTimeStepSeconds: number
): number {
	if (fixedTimeStepSeconds <= 0) {
		return 0;
	}

	return Math.max(0, step) * fixedTimeStepSeconds * getTicksPerSecond(song);
}

export function findFirstTrackWithNotes(song: TMidiSong | null): TMidiTrack | null {
	if (song == null) {
		return null;
	}

	return song.tracks.find((track) => track.notes.length > 0) ?? null;
}

export function findTrackById(song: TMidiSong | null, trackId: number | null): TMidiTrack | null {
	if (song == null || trackId == null) {
		return null;
	}

	return song.tracks.find((track) => track.id === trackId) ?? null;
}
