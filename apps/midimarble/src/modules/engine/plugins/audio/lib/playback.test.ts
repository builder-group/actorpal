import { describe, expect, it } from 'vitest';
import { buildMidiLookup } from '../../midi';
import {
	getSelectedTrackNotesAtTick,
	getSelectedTrackNotesInRange,
	midiNoteToFrequency
} from './playback';

const SONG = {
	name: 'Demo',
	bpm: 120,
	ticksPerBeat: 480,
	totalTicks: 960,
	tracks: [
		{
			id: 0,
			name: 'Lead',
			notes: [
				{ id: 1, tick: 0, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 },
				{ id: 2, tick: 8, durationTicks: 120, noteNumber: 62, velocity: 90, channel: 0 },
				{ id: 3, tick: 12, durationTicks: 120, noteNumber: 64, velocity: 80, channel: 0 }
			]
		},
		{
			id: 1,
			name: 'Bass',
			notes: [{ id: 4, tick: 8, durationTicks: 120, noteNumber: 36, velocity: 110, channel: 1 }]
		}
	]
} as const;

describe('audio playback helpers', () => {
	it('reads only the selected track in a tick range', () => {
		const midiLookup = buildMidiLookup(SONG as never);

		expect(
			getSelectedTrackNotesInRange(SONG as never, midiLookup, 0, 0, 10).map((note) => note.id)
		).toEqual([2]);
		expect(
			getSelectedTrackNotesInRange(SONG as never, midiLookup, 1, 0, 10).map((note) => note.id)
		).toEqual([4]);
	});

	it('reads notes exactly at the landed tick', () => {
		const midiLookup = buildMidiLookup(SONG as never);

		expect(
			getSelectedTrackNotesAtTick(SONG as never, midiLookup, 0, 8).map((note) => note.id)
		).toEqual([2]);
	});

	it('converts MIDI note numbers to frequencies', () => {
		expect(midiNoteToFrequency(69)).toBeCloseTo(440, 6);
	});
});
