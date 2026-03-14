import { describe, expect, it } from 'vitest';
import { clampMidiTick, stepToTick, tickToStep } from './timing';

const TEST_SONG = {
	name: 'Timing Test',
	bpm: 120,
	ticksPerBeat: 480,
	totalTicks: 960,
	tracks: []
};

describe('midi timing helpers', () => {
	it('clamps the playhead tick into the song range', () => {
		expect(clampMidiTick(-5, 20)).toBe(0);
		expect(clampMidiTick(24, 20)).toBe(20);
	});

	it('maps ticks to physics steps deterministically', () => {
		expect(tickToStep(0, TEST_SONG, 1 / 240)).toBe(0);
		expect(tickToStep(2, TEST_SONG, 1 / 240)).toBe(0);
		expect(tickToStep(4, TEST_SONG, 1 / 240)).toBe(1);
		expect(tickToStep(12, TEST_SONG, 1 / 240)).toBe(3);
	});

	it('maps physics steps back into ticks', () => {
		expect(stepToTick(0, TEST_SONG, 1 / 240)).toBe(0);
		expect(stepToTick(1, TEST_SONG, 1 / 240)).toBe(4);
		expect(stepToTick(12, TEST_SONG, 1 / 240)).toBe(48);
	});
});
