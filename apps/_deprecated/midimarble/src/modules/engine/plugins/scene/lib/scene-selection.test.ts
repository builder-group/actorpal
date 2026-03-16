import { describe, expect, it, vi } from 'vitest';
import { syncExclusiveSelectionSystem } from '../systems';
import { selectSceneEntity } from './scene-selection';

describe('scene selection helpers', () => {
	it('clears selected notes when selecting a scene entity', () => {
		const selectNote = vi.fn();
		const updateResource = vi.fn();

		selectSceneEntity(
			{
				selectNote,
				updateResource
			} as never,
			12
		);

		expect(selectNote).toHaveBeenCalledWith(null);
		expect(updateResource).toHaveBeenCalledWith('sceneSelection', { entityId: 12 });
	});

	it('clears scene selection when a note becomes selected', () => {
		const updateResource = vi.fn();
		const setControlsEnabled = vi.fn();

		syncExclusiveSelectionSystem({
			r: {
				selectedNoteId: 7,
				sceneSelection: { entityId: 3 },
				sceneManipulationState: { mode: 'move' },
				viewport: { setControlsEnabled }
			},
			updateResource
		} as never);

		expect(updateResource).toHaveBeenCalledWith('sceneSelection', { entityId: null });
		expect(updateResource).toHaveBeenCalledWith(
			'sceneManipulationState',
			expect.objectContaining({ mode: 'idle' })
		);
		expect(setControlsEnabled).toHaveBeenCalledWith(true);
	});
});
