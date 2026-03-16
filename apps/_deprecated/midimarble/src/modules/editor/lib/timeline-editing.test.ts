import { describe, expect, it } from 'vitest';
import {
	buildDrawnTimelineNote,
	buildMovedTimelineNotes,
	buildResizedTimelineNote,
	getSnappedMoveDeltaTick,
	getSnappedTimelineTick
} from './timeline-editing';

describe('timeline editing helpers', () => {
	it('moves note groups while clamping tick and pitch deltas', () => {
		expect(
			buildMovedTimelineNotes(
				[
					{ id: 1, tick: 10, durationTicks: 120, noteNumber: 60, velocity: 100 },
					{ id: 2, tick: 20, durationTicks: 120, noteNumber: 64, velocity: 100 }
				],
				-50,
				80
			)
		).toEqual([
			{ id: 1, tick: 0, durationTicks: 120, noteNumber: 123, velocity: 100 },
			{ id: 2, tick: 10, durationTicks: 120, noteNumber: 127, velocity: 100 }
		]);
	});

	it('resizes a note from either edge while keeping duration positive', () => {
		const note = { id: 1, tick: 100, durationTicks: 80, noteNumber: 60, velocity: 100 };

		expect(buildResizedTimelineNote(note, 'start', 120)).toEqual({
			...note,
			tick: 179,
			durationTicks: 1
		});
		expect(buildResizedTimelineNote(note, 'end', -100)).toEqual({
			...note,
			durationTicks: 1
		});
	});

	it('creates a default-length note for tiny draw gestures', () => {
		expect(buildDrawnTimelineNote(72, 100, 101, 480)).toEqual({
			tick: 100,
			durationTicks: 480,
			noteNumber: 72
		});
	});

	it('snaps ticks to the nearest beat when they are within the pixel threshold', () => {
		expect(getSnappedTimelineTick(479, 480, 0.5, 2)).toBe(480);
		expect(getSnappedTimelineTick(470, 480, 0.5, 2)).toBe(470);
	});

	it('snaps move deltas using the dragged note tick as the reference', () => {
		expect(getSnappedMoveDeltaTick(240, 237, 480, 1, 6)).toBe(240);
		expect(getSnappedMoveDeltaTick(240, 220, 480, 1, 6)).toBe(220);
	});
});
