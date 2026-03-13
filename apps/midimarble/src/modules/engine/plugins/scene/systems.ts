import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import {
	getEditableLinearElement,
	getLinearElementHandlePositions,
	getSceneManipulationHandleSignature,
	updateHandleAppearance
} from './lib/manipulation';
import {
	createTrackColliderSignature,
	createTrackMeshSignature,
	sameVec3
} from './lib/track-runtime';
import { createStraightTrackColliders, createStraightTrackGeometry } from './scene-bundles';
import type { TSceneApp } from './types';

export function syncAuthoredTransformsToLiveSystem(app: TSceneApp) {
	for (const [eid, authoredTransform, position, rotation, scale] of app.queryComponents([
		Entity,
		app.c.AuthoredTransformMixin,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.ScaleMixin
	] as const)) {
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
	const activeTrackEntities = new Set<number>();

	for (const [eid, mesh, collider, linear, track] of app.queryComponents(
		[
			Entity,
			app.c.MeshMixin,
			app.c.ColliderMixin,
			app.c.LinearElementMixin,
			app.c.StraightTrackMixin
		] as const,
		With(app.c.StraightTrackMixin)
	)) {
		activeTrackEntities.add(eid);

		const meshSignature = createTrackMeshSignature(linear.length, track);
		const colliderSignature = createTrackColliderSignature(linear.length, track);

		const prevMeshSignature = app.r.straightTrackMeshSignatures.get(eid);
		if (prevMeshSignature == null) {
			app.r.straightTrackMeshSignatures.set(eid, meshSignature);
		} else if (
			prevMeshSignature !== meshSignature &&
			mesh.type === 'three' &&
			mesh.object instanceof THREE.Mesh
		) {
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

			app.r.straightTrackMeshSignatures.set(eid, meshSignature);
		}

		const prevColliderSignature = app.r.straightTrackColliderSignatures.get(eid);
		if (prevColliderSignature == null) {
			app.r.straightTrackColliderSignatures.set(eid, colliderSignature);
			continue;
		}

		if (prevColliderSignature === colliderSignature) {
			continue;
		}

		app.updateComponent(eid, app.c.ColliderMixin, {
			descriptors: createStraightTrackColliders({ ...track, length: linear.length })
		});
		app.r.straightTrackColliderSignatures.set(eid, colliderSignature);
	}

	for (const eid of Array.from(app.r.straightTrackMeshSignatures.keys())) {
		if (!activeTrackEntities.has(eid)) {
			app.r.straightTrackMeshSignatures.delete(eid);
		}
	}
	for (const eid of Array.from(app.r.straightTrackColliderSignatures.keys())) {
		if (!activeTrackEntities.has(eid)) {
			app.r.straightTrackColliderSignatures.delete(eid);
		}
	}
}

export function syncSceneManipulationHandlesSystem(app: TSceneApp) {
	const selection = app.r.sceneSelection;
	const handles = app.r.sceneManipulationHandles;

	if (selection.entityId == null) {
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

	const linearElement = getEditableLinearElement(app, selection.entityId);
	if (linearElement == null) {
		app.updateResource('sceneSelection', { entityId: null });
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

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
}

export function syncSceneManipulationHandleAppearanceSystem(app: TSceneApp) {
	const signature = getSceneManipulationHandleSignature(app.r.sceneManipulationConfig);
	if (app.r.sceneManipulationHandleSignature === signature) {
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
	app.updateResource('sceneManipulationHandleSignature', signature);
}
