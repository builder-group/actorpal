import { describe, expect, it } from 'vitest';
import { createNotePlatformColliders } from '../bundles/note-platform';
import { DEFAULT_TRACK_WIDTH } from './track-shape';
import { getPlacedNoteIds, resolveNotePlatformTransform } from './note-platform';

describe('note platform helpers', () => {
	it('derives the platform center from the note anchor and platform normal', () => {
		expect(resolveNotePlatformTransform({ x: 1, y: 2, z: 3 }, 0, 0.24, 0.84)).toEqual({
			position: { x: 1 - (DEFAULT_TRACK_WIDTH - 0.84) / 2, y: 2 - (0.36 + 0.12), z: 3 },
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

	it('collects placed note ids from note platforms', () => {
		const placedNoteIds = getPlacedNoteIds({
			c: {
				NoteBindingMixin: Symbol('NoteBindingMixin'),
				NotePlatformMixin: Symbol('NotePlatformMixin')
			},
			queryComponents: () =>
				[
					[11, { noteId: 3 }],
					[12, { noteId: 7 }]
				] as never
		} as never);

		expect(placedNoteIds).toEqual(new Set([3, 7]));
	});
});
