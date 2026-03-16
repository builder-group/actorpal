import type { TSceneApp } from '../types';

export function resetSceneManipulationState(
	patch: Partial<TSceneApp['r']['sceneManipulationState']> = {}
): TSceneApp['r']['sceneManipulationState'] {
	return {
		mode: 'idle',
		entityId: null,
		isDragging: false,
		didEdit: false,
		pointerDownClient: null,
		dragPlaneX: null,
		dragOffset: null,
		...patch
	};
}
