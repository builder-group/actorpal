// Coordinate transforms + layout constants for the MIDI piano roll.
// NOTE_HEIGHT and PIANO_WIDTH match Signal's defaults for visual consistency.

export const NOTE_HEIGHT = 16; // px per semitone (matches Signal's keyHeight)
export const PIANO_WIDTH = 64; // px for piano keyboard column (matches Signal's keyWidth)
export const TOTAL_NOTES = 128;
export const TOTAL_CANVAS_HEIGHT = NOTE_HEIGHT * TOTAL_NOTES; // 2048px
export const RULER_HEIGHT = 32; // px for the time ruler bar
export const DEFAULT_SCROLL_NOTE = 72; // C5 — good default visible range

/** Maps musical coordinates (tick, noteNumber) → canvas pixels. */
export class NoteTransform {
	constructor(
		public readonly pixelsPerBeat: number,
		public readonly ticksPerBeat: number,
	) {}

	get pixelsPerTick(): number {
		return this.pixelsPerBeat / this.ticksPerBeat;
	}

	getX(tick: number): number {
		return tick * this.pixelsPerTick;
	}

	getY(noteNumber: number): number {
		return (TOTAL_NOTES - 1 - noteNumber) * NOTE_HEIGHT;
	}

	getWidth(durationTicks: number): number {
		return Math.max(durationTicks * this.pixelsPerTick, 2);
	}

	toTick(x: number): number {
		return x / this.pixelsPerTick;
	}

	totalWidth(totalTicks: number): number {
		return Math.max(this.getX(totalTicks) + this.pixelsPerBeat * 8, 1200);
	}
}

// ─── Note utilities ───────────────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteName(noteNumber: number): string {
	const octave = Math.floor(noteNumber / 12) - 1;
	return `${NOTE_NAMES[noteNumber % 12]}${octave}`;
}

export function isBlackKey(noteNumber: number): boolean {
	return [1, 3, 6, 8, 10].includes(noteNumber % 12);
}

export function isCNote(noteNumber: number): boolean {
	return noteNumber % 12 === 0;
}
