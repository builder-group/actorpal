import { createMarbleBundle, createPegboardBundle, createStraightTrackBundle } from './bundles';
import { createSceneManipulationHandles } from './lib/manipulation-handles';
import { resetSceneManipulationState } from './lib/manipulation-state';
import { setupSceneManipulation } from './lib/scene-manipulation';
import {
	syncAuthoredTransformsToLiveSystem,
	syncExclusiveSelectionSystem,
	syncSceneManipulationHandleAppearanceSystem,
	syncSceneManipulationHandlesSystem,
	syncStraightTrackRuntimeMixinsSystem
} from './systems';
import type { TSceneApp, TScenePlugin } from './types';

const MARBLE_SPAWN_POSITION = { x: -7.25, y: 18.4, z: -25.2 };

export function createScenePlugin(): TScenePlugin {
	const sceneManipulationConfig = {
		handleRadius: 0.48,
		handleColor: '#facc15',
		dragStartPixels: 3
	};
	let disposeScene: (() => void) | null = null;

	return {
		// Scene is Midimarble's app-specific composition root and editing domain.
		name: 'Scene',
		deps: ['Default', 'Core', 'Midi', 'Physics', 'Render', 'Trajectory'],
		components: {
			MarbleTag: [],
			AuthoredTransformMixin: [],
			StraightTrackMixin: [],
			LinearElementMixin: []
		},
		resources: {
			sceneSelection: {
				entityId: null
			},
			sceneManipulationState: resetSceneManipulationState(),
			sceneManipulationConfig,
			sceneManipulationHandles: createSceneManipulationHandles(
				sceneManipulationConfig.handleRadius,
				sceneManipulationConfig.handleColor
			)
		},
		appExtensions: {
			disposeScene(this: TSceneApp): void {
				disposeScene?.();
				disposeScene = null;
			}
		},
		setup(app: TSceneApp) {
			app.spawnBundle(createPegboardBundle(app));
			app.spawnBundle(
				createStraightTrackBundle(app, {
					position: { x: -7.25, y: 16, z: -18 },
					rotation: { x: 0.28, y: 0, z: 0 },
					length: 16
				})
			);
			app.spawnBundle(
				createStraightTrackBundle(app, {
					position: { x: -7.25, y: 10.9, z: -1.4 },
					rotation: { x: -0.1, y: 0, z: 0 },
					length: 14
				})
			);
			app.spawnBundle(
				createStraightTrackBundle(app, {
					position: { x: -7.25, y: 4.2, z: 12.8 },
					rotation: { x: 0.22, y: 0, z: 0 },
					length: 12
				})
			);
			app.spawnBundle(createMarbleBundle(app, { position: MARBLE_SPAWN_POSITION }));

			app.addSystem(syncAuthoredTransformsToLiveSystem, { set: 'PreUpdate' });
			app.addSystem(syncStraightTrackRuntimeMixinsSystem, { set: 'PreUpdate' });
			app.addSystem(syncExclusiveSelectionSystem, { set: 'Update' });
			app.addSystem(syncSceneManipulationHandleAppearanceSystem, { set: 'Update' });
			app.addSystem(syncSceneManipulationHandlesSystem, { set: 'PostUpdate' });
			disposeScene = setupSceneManipulation(app);
		}
	};
}
