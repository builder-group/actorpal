import { Added, Changed, Entity, Or, Removed } from 'ecsify';
import * as THREE from 'three';
import { createStraightTrackColliders, createStraightTrackGeometry } from './bundles';
import { getLinearElement, getLinearElementHandlePositions } from './lib/linear-element';
import { createMarbleColliderDescriptors, getMarbleRadius } from './lib/marble';
import { updateHandleAppearance } from './lib/manipulation-handles';
import {
	getNotePlatform,
	getNotePlatformHandlePositions,
	getPlacedNoteIds
} from './lib/note-platform';
import {
	syncResolvedNotePlatform,
	syncUnresolvedNotePlatform
} from './lib/note-platform-runtime';
import { resetSceneManipulationState } from './lib/manipulation-state';
import { clearSceneEntitySelection } from './lib/scene-selection';
import { sameVec3 } from './lib/vec3';
import type { TSceneApp } from './types';

export function syncAuthoredTransformsToLiveSystem(app: TSceneApp) {
	for (const [eid, authoredTransform, position, rotation, scale] of app.queryComponents(
		[
			Entity,
			app.c.AuthoredTransformMixin,
			app.c.PositionMixin,
			app.c.RotationMixin,
			app.c.ScaleMixin
		] as const,
		Or(Added(app.c.AuthoredTransformMixin), Changed(app.c.AuthoredTransformMixin))
	)) {
		if (!sameVec3(position, authoredTransform.position)) {
			app.updateComponent(eid, app.c.PositionMixin, { ...authoredTransform.position });
		}
		if (!sameVec3(rotation, authoredTransform.rotation)) {
			app.updateComponent(eid, app.c.RotationMixin, { ...authoredTransform.rotation });
		}
		if (!sameVec3(scale, authoredTransform.scale)) {
			app.updateComponent(eid, app.c.ScaleMixin, { ...authoredTransform.scale });
		}
	}
}

export function syncStraightTrackRuntimeMixinsSystem(app: TSceneApp) {
	for (const [eid, mesh, linear, track] of app.queryComponents(
		[Entity, app.c.MeshMixin, app.c.LinearElementMixin, app.c.StraightTrackMixin] as const,
		Or(
			Added(app.c.StraightTrackMixin),
			Changed(app.c.StraightTrackMixin),
			Added(app.c.LinearElementMixin),
			Changed(app.c.LinearElementMixin)
		)
	)) {
		if (mesh.type === 'three' && mesh.object instanceof THREE.Mesh) {
			mesh.object.geometry.dispose();
			mesh.object.geometry = createStraightTrackGeometry({ ...track, length: linear.length });

			const material = mesh.object.material;
			if (Array.isArray(material)) {
				for (const entry of material) {
					if ('color' in entry) {
						entry.color.set(track.color);
					}
				}
			} else if (material instanceof THREE.MeshStandardMaterial) {
				material.color.set(track.color);
			}
		}

		app.updateComponent(eid, app.c.ColliderMixin, {
			descriptors: createStraightTrackColliders({ ...track, length: linear.length })
		});
	}
}

export function syncMarbleRuntimeMixinsSystem(app: TSceneApp) {
	for (const [eid, marblePhysics, collider] of app.queryComponents(
		[Entity, app.c.MarblePhysicsMixin, app.c.ColliderMixin] as const,
		Or(Added(app.c.MarblePhysicsMixin), Changed(app.c.MarblePhysicsMixin))
	)) {
		const radius = getMarbleRadius(collider.descriptors);
		app.updateComponent(eid, app.c.ColliderMixin, {
			descriptors: createMarbleColliderDescriptors(radius, marblePhysics.bounce)
		});
	}
}

export function syncNotePlatformRuntimeSystem(app: TSceneApp) {
	if (app.r.simulationSync.mode !== 'idle') {
		return;
	}

	const shouldSyncProjection = app.wasResourceChanged('trajectoryProjection');
	const changedPlatformEntities = new Set(
		app.queryEntities(Or(Added(app.c.NotePlatformMixin), Changed(app.c.NotePlatformMixin)))
	);
	if (!shouldSyncProjection && changedPlatformEntities.size === 0) {
		return;
	}
	let didProjectionAffectSimulation = false;

	for (const [eid, binding, platform, position, rotation, mesh, collider] of app.queryComponents(
		[
			Entity,
			app.c.NoteBindingMixin,
			app.c.NotePlatformMixin,
			app.c.PositionMixin,
			app.c.RotationMixin,
			app.c.MeshMixin,
			app.c.ColliderMixin
		] as const
	)) {
		const anchor = app.r.trajectoryProjection.noteAnchorsById.get(binding.noteId);
		if (anchor == null) {
			const didRuntimeChange = syncUnresolvedNotePlatform(
				app,
				eid,
				collider.descriptors,
				mesh.type === 'three' ? mesh.object : null
			);
			if (shouldSyncProjection && didRuntimeChange) {
				didProjectionAffectSimulation = true;
			}
			continue;
		}

		const didRuntimeChange = syncResolvedNotePlatform(
			app,
			eid,
			platform,
			position,
			rotation,
			collider.descriptors,
			mesh.type === 'three' ? mesh.object : null,
			anchor.position,
			changedPlatformEntities.has(eid)
		);
		if (shouldSyncProjection && didRuntimeChange) {
			didProjectionAffectSimulation = true;
		}
	}

	if (shouldSyncProjection && didProjectionAffectSimulation) {
		app.markSimulationDirty();
		app.requestSimulationSync();
	}
}

export function syncSceneManipulationHandlesSystem(app: TSceneApp) {
	const selection = app.r.sceneSelection;
	const handles = app.r.sceneManipulationHandles;

	if (app.r.previewConfig.enabled) {
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

	if (selection.entityId == null) {
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

	const linearElement = getLinearElement(app, selection.entityId);
	if (linearElement != null) {
		const handlePositions = getLinearElementHandlePositions(
			linearElement.transform.position,
			linearElement.transform.rotation.x,
			linearElement.linear.length,
			linearElement.linear.handleOffset
		);

		handles.start.position.copy(handlePositions.start);
		handles.end.position.copy(handlePositions.end);
		handles.start.visible = true;
		handles.end.visible = true;
		return;
	}

	const notePlatform = getNotePlatform(app, selection.entityId);
	const notePlatformObject = app.r.sceneObjects.get(selection.entityId);
	if (notePlatform == null || notePlatformObject?.visible === false) {
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

	const handlePositions = getNotePlatformHandlePositions(
		notePlatform.position,
		notePlatform.platform.rotationX,
		notePlatform.platform.length
	);
	handles.start.position.copy(handlePositions.start);
	handles.end.position.copy(handlePositions.end);
	handles.start.visible = true;
	handles.end.visible = true;
}

export function syncSceneManipulationHandleAppearanceSystem(app: TSceneApp) {
	if (!app.wasResourceChanged('sceneManipulationConfig')) {
		return;
	}

	updateHandleAppearance(
		app.r.sceneManipulationHandles.start,
		app.r.sceneManipulationConfig.handleRadius,
		app.r.sceneManipulationConfig.handleColor
	);
	updateHandleAppearance(
		app.r.sceneManipulationHandles.end,
		app.r.sceneManipulationConfig.handleRadius,
		app.r.sceneManipulationConfig.handleColor
	);
}

export function syncExclusiveSelectionSystem(app: TSceneApp) {
	if (app.r.selectedNoteId == null || app.r.sceneSelection.entityId == null) {
		return;
	}

	clearSceneEntitySelection(app);
}

export function syncPreviewInteractionSystem(app: TSceneApp) {
	if (!app.wasResourceChanged('previewConfig') || !app.r.previewConfig.enabled) {
		return;
	}

	const state = app.r.sceneManipulationState;
	if (state.mode === 'idle') {
		return;
	}

	if (state.didEdit) {
		app.markSimulationDirty();
		app.requestSimulationSync();
		app.updateResource('sceneEditState', { pending: false });
	}

	app.updateResource('sceneManipulationState', resetSceneManipulationState());
}

export function syncNotePlatformMarkerStateSystem(app: TSceneApp) {
	const didNotePlatformStateChange =
		app.queryEntities(
			Or(
				Added(app.c.NotePlatformMixin),
				Changed(app.c.NotePlatformMixin),
				Removed(app.c.NotePlatformMixin),
				Added(app.c.NoteBindingMixin),
				Removed(app.c.NoteBindingMixin)
			)
		).length > 0;
	if (
		!didNotePlatformStateChange &&
		!app.wasResourceChanged('trajectoryProjection') &&
		!app.wasResourceChanged('selectedNoteId')
	) {
		return;
	}

	app.syncPlacedNoteMarkers(getPlacedNoteIds(app));
}
