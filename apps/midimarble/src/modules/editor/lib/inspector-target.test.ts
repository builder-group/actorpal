import { describe, expect, it } from 'vitest';
import { buildEmptyInspectorTarget, buildNoteInspectorTarget } from './inspector-target';

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
});
