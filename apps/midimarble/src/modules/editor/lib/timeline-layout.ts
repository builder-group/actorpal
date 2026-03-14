import type { TMidiNote, TMidiSong } from '@/modules/engine/plugins/midi';

export const RULER_HEIGHT = 28;
export const PIANO_WIDTH = 72;
export const NOTE_ROW_HEIGHT = 18;
export const MIN_NOTE_RANGE = 12;
export const MIN_ROLL_HEIGHT = 220;
export const DEFAULT_PIXELS_PER_BEAT = 48;
export const MIN_PIXELS_PER_BEAT = 20;
export const MAX_PIXELS_PER_BEAT = 320;
export const ZOOM_STEP_FACTOR = 1.25;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getPixelsPerTick(
	song: Pick<TMidiSong, 'ticksPerBeat'> | null,
	pixelsPerBeat = DEFAULT_PIXELS_PER_BEAT
): number {
	if (song == null) {
		return 0;
	}

	return pixelsPerBeat / Math.max(1, song.ticksPerBeat);
}

export function buildBeatTicks(
	totalTicks: number,
	ticksPerBeat: number
): {
	majorBeats: number[];
	minorBeats: number[];
} {
	const totalBeats = Math.max(1, Math.ceil(totalTicks / Math.max(1, ticksPerBeat)));
	const beatStride =
		totalBeats > 512
			? 32
			: totalBeats > 256
				? 16
				: totalBeats > 128
					? 8
					: totalBeats > 64
						? 4
						: totalBeats > 32
							? 2
							: 1;

	return {
		majorBeats: Array.from(
			{ length: Math.ceil(totalBeats / beatStride) + 1 },
			(_, index) => index * beatStride
		).filter((beat) => beat * ticksPerBeat <= totalTicks),
		minorBeats:
			beatStride === 1
				? Array.from({ length: totalBeats }, (_, index) => index + 0.5).filter(
						(beat) => beat * ticksPerBeat <= totalTicks
					)
				: []
	};
}

export function buildNoteRows(notes: Pick<TMidiNote, 'noteNumber'>[]): number[] {
	if (notes.length === 0) {
		return Array.from({ length: MIN_NOTE_RANGE }, (_, index) => 71 - index);
	}

	const noteNumbers = notes.map((note) => note.noteNumber);
	const minNote = Math.min(...noteNumbers);
	const maxNote = Math.max(...noteNumbers);
	const range = maxNote - minNote + 1;
	const padding = Math.max(0, MIN_NOTE_RANGE - range);
	const low = Math.max(0, minNote - Math.floor(padding / 2) - 1);
	const high = Math.min(127, maxNote + Math.ceil(padding / 2) + 1);

	return Array.from({ length: high - low + 1 }, (_, index) => high - index);
}

export function getNoteName(noteNumber: number): string {
	const octave = Math.floor(noteNumber / 12) - 1;
	return `${NOTE_NAMES[noteNumber % 12]}${octave}`;
}

export function isBlackKey(noteNumber: number): boolean {
	return [1, 3, 6, 8, 10].includes(noteNumber % 12);
}
