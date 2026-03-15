import { Entity, With } from 'ecsify';
import {
	createMarbleBundle,
	createNotePlatformBundle,
	createPegboardBundle,
	createStraightTrackBundle
} from './bundles';
import { MIDIMARBLE_SCENE_DEFAULTS, SCENE_MANIPULATION_DEFAULTS } from './config';
import { createSceneManipulationHandles } from './lib/manipulation-handles';
import { resetSceneManipulationState } from './lib/manipulation-state';
import { findNotePlatformEntityId } from './lib/note-platform';
import { updateMarblePhysicsAuthoring, updateNotePlatformAuthoring } from './lib/scene-authoring';
import { setupSceneManipulation } from './lib/scene-manipulation';
import { clearSceneEntitySelection, selectSceneEntity } from './lib/scene-selection';
import {
	syncAuthoredTransformsToLiveSystem,
	syncExclusiveSelectionSystem,
	syncMarbleRuntimeMixinsSystem,
	syncNotePlatformMarkerStateSystem,
	syncNotePlatformRuntimeSystem,
	syncOrphanedNotePlatformsSystem,
	syncPreviewInteractionSystem,
	syncSceneManipulationHandleAppearanceSystem,
	syncSceneManipulationHandlesSystem,
	syncStraightTrackRuntimeMixinsSystem
} from './systems';
import type { TSceneApp, TScenePlugin } from './types';

export function createScenePlugin(): TScenePlugin {
	const sceneManipulationConfig = SCENE_MANIPULATION_DEFAULTS;
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
			createStraightTrack(this: TSceneApp): number | null {
				const spawnPosition = resolveStraightTrackSpawnPosition(this);
				if (spawnPosition == null) {
					return null;
				}

				const entityId = this.spawnBundle(
					createStraightTrackBundle(this, {
						position: spawnPosition,
						rotation: { x: 0, y: 0, z: 0 }
					})
				);
				selectSceneEntity(this, entityId);
				this.markSimulationDirty();
				this.requestSimulationSync();
				return entityId;
			},
			deleteStraightTrack(this: TSceneApp, entityId: number): boolean {
				if (!this.hasComponent(entityId, this.c.StraightTrackMixin)) {
					return false;
				}

				if (
					this.r.sceneSelection.entityId === entityId ||
					this.r.sceneManipulationState.entityId === entityId
				) {
					clearSceneEntitySelection(this);
				}

				this.destroyEntity(entityId);
				this.markSimulationDirty();
				this.requestSimulationSync();
				return true;
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
			},
			setSceneEditPending(this: TSceneApp, pending: boolean): void {
				if (this.r.sceneEditState.pending === pending) {
					return;
				}

				this.updateResource('sceneEditState', { pending });
			}
		},
		setup(app: TSceneApp) {
			app.spawnBundle(createPegboardBundle(app));
			for (const track of MIDIMARBLE_SCENE_DEFAULTS.seedStraightTracks) {
				app.spawnBundle(createStraightTrackBundle(app, track));
			}
			const marbleEntityId = app.spawnBundle(
				createMarbleBundle(app, { position: MIDIMARBLE_SCENE_DEFAULTS.marbleSpawnPosition })
			);
			app.setPreviewTargetEntity(marbleEntityId);

			app.addSystem(syncAuthoredTransformsToLiveSystem, { set: 'PreUpdate' });
			app.addSystem(syncMarbleRuntimeMixinsSystem, { set: 'PreUpdate' });
			app.addSystem(syncStraightTrackRuntimeMixinsSystem, { set: 'PreUpdate' });
			app.addSystem(syncExclusiveSelectionSystem, { set: 'Update' });
			app.addSystem(syncOrphanedNotePlatformsSystem, {
				set: 'Update',
				after: syncExclusiveSelectionSystem
			});
			app.addSystem(syncPreviewInteractionSystem, {
				set: 'Update',
				after: syncOrphanedNotePlatformsSystem
			});
			app.addSystem(syncSceneManipulationHandleAppearanceSystem, { set: 'Update' });
			app.addSystem(syncNotePlatformRuntimeSystem, { set: 'PostUpdate' });
			app.addSystem(syncSceneManipulationHandlesSystem, { set: 'PostUpdate' });
			app.addSystem(syncNotePlatformMarkerStateSystem, { set: 'PostUpdate' });
			disposeScene = setupSceneManipulation(app);
		}
	};
}

function resolveStraightTrackSpawnPosition(
	app: TSceneApp
): { x: number; y: number; z: number } | null {
	for (const [eid, position] of app.queryComponents(
		[Entity, app.c.PositionMixin] as const,
		With(app.c.MarbleTag)
	)) {
		const liveBody = app.r.rigidBodies.get(eid);
		const translation = liveBody?.translation();
		const basePosition =
			translation == null
				? position
				: {
						x: translation.x,
						y: translation.y,
						z: translation.z
					};

		return {
			x: MIDIMARBLE_SCENE_DEFAULTS.straightTrackWallLaneX,
			y: basePosition.y + MIDIMARBLE_SCENE_DEFAULTS.newStraightTrackYOffset,
			z: basePosition.z + MIDIMARBLE_SCENE_DEFAULTS.newStraightTrackZOffset
		};
	}

	return null;
}
