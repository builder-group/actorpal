import { describe, expect, it } from 'vitest';
import {
	buildEmptyInspectorTarget,
	buildNoteInspectorTarget,
	buildStraightTrackInspectorTarget
} from './inspector-target';

const SONG = {
	bpm: 120,
	ticksPerBeat: 480
} as const;

describe('inspector target helpers', () => {
	it('builds a note inspector target with derived step and path state', () => {
		expect(
			buildNoteInspectorTarget(
				SONG,
				'Lead',
				{
					id: 1,
					tick: 8,
					durationTicks: 120,
					noteNumber: 60,
					velocity: 100,
					channel: 0
				},
				1,
				3,
				1 / 240,
				{ x: 1, y: 2, z: 3 },
				null
			)
		).toMatchObject({
			kind: 'note',
			noteName: 'C4',
			step: 2,
			pathState: 'future',
			trackName: 'Lead',
			position: { x: 1, y: 2, z: 3 }
		});
	});

	it('builds an empty inspector target', () => {
		expect(buildEmptyInspectorTarget()).toEqual({
			kind: 'empty',
			message: 'Select a note, straight track, or marble to inspect it.'
		});
	});

	it('builds a straight-track inspector target', () => {
		expect(
			buildStraightTrackInspectorTarget(12, {
				position: { x: -7.25, y: 10, z: 4 },
				rotation: { x: 0.3, y: 0, z: 0 },
				length: 14,
				width: 1.5,
				channelWidth: 1.3,
				channelDepth: 0.2,
				color: '#2a5e92'
			})
		).toMatchObject({
			kind: 'straight-track',
			entityId: 12,
			position: { x: -7.25, y: 10, z: 4 },
			length: 14
		});
	});
});
