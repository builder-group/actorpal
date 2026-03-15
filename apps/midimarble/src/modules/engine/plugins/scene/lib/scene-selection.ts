import type { TSceneApp } from '../types';
import { resetSceneManipulationState } from './manipulation-state';

export function clearSceneEntitySelection(app: TSceneApp): void {
	if (app.r.sceneSelection.entityId != null) {
		app.updateResource('sceneSelection', { entityId: null });
	}
	if (app.r.sceneManipulationState.mode !== 'idle') {
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
	}
	app.r.viewport.setControlsEnabled(true);
}

export function selectSceneEntity(app: TSceneApp, entityId: number): void {
	app.selectNote(null);
	app.updateResource('sceneSelection', { entityId });
}
