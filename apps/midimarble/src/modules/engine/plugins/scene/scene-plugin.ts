import { Entity, With } from 'ecsify';
import {
	createMarbleBundle,
	createNotePlatformBundle,
	createPegboardBundle,
	createStraightTrackBundle
} from './bundles';
import { sceneConfig } from './config';
import { createSceneManipulationHandles } from './lib/manipulation-handles';
import { resetSceneManipulationState } from './lib/manipulation-state';
import { findNotePlatformEntityId } from './lib/note-platform';
import {
	updateMarblePhysicsAuthoring,
	updateNotePlatformAuthoring,
	updateStraightTrackGeometryAuthoring,
	updateStraightTrackTransformAuthoring
} from './lib/scene-authoring';
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

interface TScenePluginOptions {
	marble?: {
		position: { x: number; y: number; z: number };
		rotation: { x: number; y: number; z: number };
		bounce: number;
	};
	straightTracks?: Array<{
		position: { x: number; y: number; z: number };
		rotation: { x: number; y: number; z: number };
		scale: { x: number; y: number; z: number };
		length: number;
		height: number;
		width: number;
		channelWidth: number;
		channelDepth: number;
		color: string;
	}>;
	notePlatforms?: Array<{
		noteId: number;
		offsetY: number;
		offsetZ: number;
		rotationX: number;
		length: number;
		width: number;
		thickness: number;
		bounce: number;
		color: string;
	}>;
}

export function createScenePlugin(options?: TScenePluginOptions): TScenePlugin {
	const sceneManipulationConfig = sceneConfig.manipulation;
	const pendingNotePlatforms = options?.notePlatforms ? [...options.notePlatforms] : [];
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
			updateStraightTrackTransform(
				this: TSceneApp,
				entityId: number,
				patch: Partial<TSceneApp['c']['AuthoredTransformMixin'][number]>
			): boolean {
				return updateStraightTrackTransformAuthoring(this, entityId, patch);
			},
			updateStraightTrackGeometry(
				this: TSceneApp,
				entityId: number,
				patch: Partial<TSceneApp['c']['StraightTrackMixin'][number] & { length: number }>
			): boolean {
				return updateStraightTrackGeometryAuthoring(this, entityId, patch);
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

			const marblePosition = options?.marble?.position ?? sceneConfig.marble.spawn.position;
			const marbleEntityId = app.spawnBundle(
				createMarbleBundle(app, {
					position: marblePosition,
					rotation: options?.marble?.rotation
				})
			);
			if (options?.marble != null) {
				updateMarblePhysicsAuthoring(app, marbleEntityId, { bounce: options.marble.bounce });
			}
			app.setPreviewTargetEntity(marbleEntityId);

			for (const snapshot of options?.straightTracks ?? []) {
				app.spawnBundle(createStraightTrackBundle(app, snapshot));
			}

			if (pendingNotePlatforms.length > 0) {
				app.addSystem(
					() => {
						if (pendingNotePlatforms.length === 0) return;
						for (let i = pendingNotePlatforms.length - 1; i >= 0; i--) {
							const snapshot = pendingNotePlatforms[i];
							if (snapshot == null) continue;
							// Anchors from the previous PostUpdate trajectory computation persist here
							const anchor = app.r.trajectoryProjection.noteAnchorsById.get(snapshot.noteId);
							if (anchor == null) continue;
							if (findNotePlatformEntityId(app, snapshot.noteId) != null) {
								pendingNotePlatforms.splice(i, 1);
								continue;
							}
							const eid = app.spawnBundle(
								createNotePlatformBundle(app, snapshot.noteId, anchor.position)
							);
							app.updateNotePlatform(eid, {
								offsetY: snapshot.offsetY,
								offsetZ: snapshot.offsetZ,
								rotationX: snapshot.rotationX,
								length: snapshot.length,
								width: snapshot.width,
								thickness: snapshot.thickness,
								bounce: snapshot.bounce,
								color: snapshot.color
							});
							pendingNotePlatforms.splice(i, 1);
						}
					},
					{ set: 'PreUpdate' }
				);
			}

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
			x: sceneConfig.track.wallLaneX,
			y: basePosition.y + sceneConfig.track.newTrackYOffset,
			z: basePosition.z + sceneConfig.track.newTrackZOffset
		};
	}

	return null;
}
