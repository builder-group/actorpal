import { describe, expect, it } from 'vitest';
import { getPlacedNoteIds, resolveNotePlatformTransform } from './note-platform';

describe('note platform helpers', () => {
	it('derives the platform center from the note anchor and platform normal', () => {
		expect(
			resolveNotePlatformTransform(
				{ x: 1, y: 2, z: 3 },
				0,
				0.24
			)
		).toEqual({
			position: { x: 1, y: 2 - (0.36 + 0.12), z: 3 },
			rotation: { x: 0, y: 0, z: 0 }
		});
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
