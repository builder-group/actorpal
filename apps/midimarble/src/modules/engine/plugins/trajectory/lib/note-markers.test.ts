import { describe, expect, it } from 'vitest';
import { buildTrajectoryMarkerDescriptors } from './note-markers';

const SONG = {
	bpm: 120,
	ticksPerBeat: 480
} as const;

describe('buildTrajectoryMarkerDescriptors', () => {
	it('builds past and buffered-future markers only', () => {
		const descriptors = buildTrajectoryMarkerDescriptors(
			SONG,
			{
				notes: [
					{ id: 1, tick: 0, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 },
					{ id: 2, tick: 8, durationTicks: 120, noteNumber: 62, velocity: 100, channel: 0 },
					{ id: 3, tick: 20, durationTicks: 120, noteNumber: 64, velocity: 100, channel: 0 }
				]
			},
			2,
			1,
			4,
			1 / 240,
			new Map([
				[0, { x: 0, y: 0, z: 0 }],
				[1, { x: 1, y: 0, z: 0 }],
				[2, { x: 2, y: 0, z: 0 }]
			])
		);

		expect(descriptors).toEqual([
			{
				noteId: 1,
				tick: 0,
				step: 0,
				position: { x: 0, y: 0, z: 0 },
				phase: 'past',
				selected: false
			},
			{
				noteId: 2,
				tick: 8,
				step: 2,
				position: { x: 2, y: 0, z: 0 },
				phase: 'future',
				selected: true
			}
		]);
	});
});
