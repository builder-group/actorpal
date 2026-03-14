import {
	createMarbleBundle,
	createNotePlatformBundle,
	createPegboardBundle,
	createStraightTrackBundle
} from './bundles';
import { createSceneManipulationHandles } from './lib/manipulation-handles';
import { resetSceneManipulationState } from './lib/manipulation-state';
import { findNotePlatformEntityId } from './lib/note-platform';
import { updateMarblePhysicsAuthoring, updateNotePlatformAuthoring } from './lib/scene-authoring';
import { setupSceneManipulation } from './lib/scene-manipulation';
import { selectSceneEntity } from './lib/scene-selection';
import {
	syncAuthoredTransformsToLiveSystem,
	syncExclusiveSelectionSystem,
	syncMarbleRuntimeMixinsSystem,
	syncNotePlatformMarkerStateSystem,
	syncNotePlatformRuntimeSystem,
	syncPreviewInteractionSystem,
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
			MarblePhysicsMixin: [],
			AuthoredTransformMixin: [],
			StraightTrackMixin: [],
			LinearElementMixin: [],
			NoteBindingMixin: [],
			NotePlatformMixin: []
		},
		resources: {
			sceneSelection: {
				entityId: null
			},
			sceneEditState: {
				pending: false
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
			},
			createOrSelectNotePlatform(this: TSceneApp, noteId: number): number | null {
				const existingEntityId = findNotePlatformEntityId(this, noteId);
				if (existingEntityId != null) {
					selectSceneEntity(this, existingEntityId);
					return existingEntityId;
				}

				const anchor = this.r.trajectoryProjection.noteAnchorsById.get(noteId);
				if (anchor == null) {
					return null;
				}

				const entityId = this.spawnBundle(createNotePlatformBundle(this, noteId, anchor.position));
				selectSceneEntity(this, entityId);
				this.markSimulationDirty();
				this.requestSimulationSync();
				return entityId;
			},
			updateNotePlatform(
				this: TSceneApp,
				entityId: number,
				patch: Partial<TSceneApp['c']['NotePlatformMixin'][number]>
			) {
				return updateNotePlatformAuthoring(this, entityId, patch);
			},
			updateMarblePhysics(
				this: TSceneApp,
				entityId: number,
				patch: Partial<TSceneApp['c']['MarblePhysicsMixin'][number]>
			) {
				return updateMarblePhysicsAuthoring(this, entityId, patch);
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
			const marbleEntityId = app.spawnBundle(
				createMarbleBundle(app, { position: MARBLE_SPAWN_POSITION })
			);
			app.updateResource('previewState', {
				...app.r.previewState,
				targetEntityId: marbleEntityId
			});

			app.addSystem(syncAuthoredTransformsToLiveSystem, { set: 'PreUpdate' });
			app.addSystem(syncMarbleRuntimeMixinsSystem, { set: 'PreUpdate' });
			app.addSystem(syncStraightTrackRuntimeMixinsSystem, { set: 'PreUpdate' });
			app.addSystem(syncExclusiveSelectionSystem, { set: 'Update' });
			app.addSystem(syncPreviewInteractionSystem, {
				set: 'Update',
				after: syncExclusiveSelectionSystem
			});
			app.addSystem(syncSceneManipulationHandleAppearanceSystem, { set: 'Update' });
			app.addSystem(syncNotePlatformRuntimeSystem, { set: 'PostUpdate' });
			app.addSystem(syncSceneManipulationHandlesSystem, { set: 'PostUpdate' });
			app.addSystem(syncNotePlatformMarkerStateSystem, { set: 'PostUpdate' });
			disposeScene = setupSceneManipulation(app);
		}
	};
}
