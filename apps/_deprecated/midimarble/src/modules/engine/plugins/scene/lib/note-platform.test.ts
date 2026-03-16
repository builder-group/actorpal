import { describe, expect, it } from 'vitest';
import { createNotePlatformColliders } from '../bundles/note-platform';
import { sceneConfig } from '../config';
import {
	getNotePlatformNoteState,
	isNotePlatformAdjusted,
	resolveNotePlatformTransform
} from './note-platform';

describe('note platform helpers', () => {
	it('derives the platform center from the note anchor and platform normal', () => {
		expect(resolveNotePlatformTransform({ x: 1, y: 2, z: 3 }, 0.4, -1.2, 0, 0.24, 0.84)).toEqual({
			position: {
				x: 1 - (sceneConfig.track.defaultWidth - 0.84) / 2,
				y: 2 - (0.36 + 0.12) + 0.4,
				z: 3 - 1.2
			},
			rotation: { x: 0, y: 0, z: 0 }
		});
	});

	it('builds note-platform colliders as a track body plus one wall-side rail', () => {
		const colliders = createNotePlatformColliders({
			length: 1.2,
			width: 0.84,
			thickness: 0.22,
			bounce: 0.58
		});

		expect(colliders).toHaveLength(2);
		expect(colliders[1]).toEqual(
			expect.objectContaining({
				shape: 'cuboid',
				translation: expect.objectContaining({
					x: expect.any(Number)
				})
			})
		);
	});

	it('collects placed and adjusted note ids from note platforms', () => {
		const noteState = getNotePlatformNoteState({
			c: {
				NoteBindingMixin: Symbol('NoteBindingMixin'),
				NotePlatformMixin: Symbol('NotePlatformMixin')
			},
			queryComponents: () =>
				[
					[11, { noteId: 3 }, { offsetY: 0, offsetZ: 0 }],
					[12, { noteId: 7 }, { offsetY: 0.2, offsetZ: 0 }]
				] as never
		} as never);

		expect(noteState).toEqual({
			placedNoteIds: new Set([3, 7]),
			adjustedNoteIds: new Set([7])
		});
	});

	it('treats lift or push offsets as an adjusted note platform', () => {
		expect(isNotePlatformAdjusted({ offsetY: 0, offsetZ: 0 })).toBe(false);
		expect(isNotePlatformAdjusted({ offsetY: 0.2, offsetZ: 0 })).toBe(true);
		expect(isNotePlatformAdjusted({ offsetY: 0, offsetZ: -0.3 })).toBe(true);
	});
});
