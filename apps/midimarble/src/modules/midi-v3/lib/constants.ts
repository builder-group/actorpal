export const MIDI_V3_NOTE_HEIGHT = 18;
export const MIDI_V3_KEYBOARD_WIDTH = 88;
export const MIDI_V3_RULER_HEIGHT = 40;
export const MIDI_V3_TOTAL_NOTES = 128;
export const MIDI_V3_GRID_HEIGHT = MIDI_V3_TOTAL_NOTES * MIDI_V3_NOTE_HEIGHT;
export const MIDI_V3_DEFAULT_SCROLL_NOTE = 60;
export const MIDI_V3_MIN_PIXELS_PER_BEAT = 24;
export const MIDI_V3_MAX_PIXELS_PER_BEAT = 320;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getMidiV3NoteName(noteNumber: number): string {
	const octave = Math.floor(noteNumber / 12) - 1;
	return `${NOTE_NAMES[noteNumber % 12]}${octave}`;
}

export function isMidiV3BlackKey(noteNumber: number): boolean {
	return [1, 3, 6, 8, 10].includes(noteNumber % 12);
}

export function isMidiV3CNote(noteNumber: number): boolean {
	return noteNumber % 12 === 0;
}

export function formatMidiV3Duration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return '0:00';
	}

	const minutes = Math.floor(seconds / 60);
	const wholeSeconds = Math.floor(seconds % 60);
	return `${minutes}:${String(wholeSeconds).padStart(2, '0')}`;
}

export function formatMidiV3Channel(channel: number | null): string {
	return channel == null ? 'Mixed' : `Ch ${channel + 1}`;
}
