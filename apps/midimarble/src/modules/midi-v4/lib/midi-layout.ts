// Coordinate transforms for the piano roll.
//
// Sync contract (critical for ruler ↔ grid alignment):
//   - notesWidth(totalTicks) = totalTicks * pixelsPerTick (exact, no padding).
//   - % note positions: tick/totalTicks * 100% = tick * pixelsPerTick ✓
//   - Grid background repeats at pixelsPerBeat intervals from x=0           ✓
//   - Ruler marks at beat * pixelsPerBeat                                   ✓
//   All three use the same pixel math → always in sync after zoom.
//
// End padding is a separate spacer div (sibling to the notes div), so it never
// distorts the % ↔ pixel mapping.

import { midiConfig } from './midi-config';

export class MidiLayout {
	constructor(
		public readonly pixelsPerBeat: number,
		public readonly ticksPerBeat: number
	) {}

	get pixelsPerTick(): number {
		return this.pixelsPerBeat / this.ticksPerBeat;
	}

	tickToPx(tick: number): number {
		return tick * this.pixelsPerTick;
	}

	pxToTick(px: number): number {
		return px / this.pixelsPerTick;
	}

	/** Exact notes-area width — no extra padding (see sync contract above). */
	notesWidth(totalTicks: number): number {
		return totalTicks * this.pixelsPerTick;
	}

	/** Px of breathing room after the last note. */
	endPadding(): number {
		return this.pixelsPerBeat * midiConfig.layout.endPaddingBeats;
	}
}

// MARK: - Note utilities

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteName(noteNumber: number): string {
	return `${NOTE_NAMES[noteNumber % 12]}${Math.floor(noteNumber / 12) - 1}`;
}

export function isBlackKey(noteNumber: number): boolean {
	return [1, 3, 6, 8, 10].includes(noteNumber % 12);
}

export function isCNote(noteNumber: number): boolean {
	return noteNumber % 12 === 0;
}

export function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${String(s).padStart(2, '0')}`;
}
