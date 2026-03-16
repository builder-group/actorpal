import { describe, expect, it } from 'vitest';
import { getTrajectoryBufferedStep } from './trajectory-samples';

const SONG = {
	totalTicks: 16,
	bpm: 120,
	ticksPerBeat: 480
} as const;

describe('getTrajectoryBufferedStep', () => {
	it('clamps the buffered step to the song end', () => {
		expect(getTrajectoryBufferedStep(SONG, 100, 1 / 240)).toBe(4);
	});

	it('keeps the buffered step unchanged without a song', () => {
		expect(getTrajectoryBufferedStep(null, 100, 1 / 240)).toBe(100);
	});
});
