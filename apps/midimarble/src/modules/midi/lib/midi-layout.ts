import { midiConfig } from './midi-config';

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class MidiLayout {
	public constructor(
		public readonly pixelsPerBeat: number,
		public readonly ticksPerBeat: number
	) {}

	public get pixelsPerTick(): number {
		return this.pixelsPerBeat / Math.max(1, this.ticksPerBeat);
	}

	public tickToPx(tick: number): number {
		return tick * this.pixelsPerTick;
	}

	public pxToTick(px: number): number {
		return px / this.pixelsPerTick;
	}

	public getNoteY(noteNumber: number): number {
		return (midiConfig.layout.totalNotes - 1 - noteNumber) * midiConfig.layout.noteHeight;
	}

	public getContentWidth(totalTicks: number): number {
		const paddingWidth = this.pixelsPerBeat * midiConfig.layout.endPaddingBeats;
		return Math.max(this.tickToPx(totalTicks) + paddingWidth, midiConfig.layout.minContentWidth);
	}

	public tickToContentPercent(tick: number, totalTicks: number): number {
		return (this.tickToPx(tick) / Math.max(1, this.getContentWidth(totalTicks))) * 100;
	}

	public durationToContentPercent(durationTicks: number, totalTicks: number): number {
		return (this.tickToPx(durationTicks) / Math.max(1, this.getContentWidth(totalTicks))) * 100;
	}
}

export function getMidiNoteName(noteNumber: number): string {
	const octave = Math.floor(noteNumber / 12) - 1;
	return `${noteNames[noteNumber % 12]}${octave}`;
}

export function isMidiBlackKey(noteNumber: number): boolean {
	return [1, 3, 6, 8, 10].includes(noteNumber % 12);
}

export function isMidiCNote(noteNumber: number): boolean {
	return noteNumber % 12 === 0;
}

export function formatMidiDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return '0:00';
	}

	const minutes = Math.floor(seconds / 60);
	const wholeSeconds = Math.floor(seconds % 60);
	return `${minutes}:${String(wholeSeconds).padStart(2, '0')}`;
}

export function formatMidiChannel(channel: number | null): string {
	return channel == null ? 'Mixed' : `Ch ${channel + 1}`;
}
