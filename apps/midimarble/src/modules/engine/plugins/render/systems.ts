import { Added, Changed, Entity, Or, Removed } from 'ecsify';
import {
	areVec3Close,
	computePreviewCameraPose,
	getPreviewSideSign,
	getPreviewSmoothingAlpha,
	lerpVec3
} from './lib/preview-camera';
import { replaceMountedThreeObject, syncThreeObjectTransform } from './lib/three-object';
import type { TRenderApp } from './types';

export function mountThreeObjectsSystem(app: TRenderApp) {
	for (const [eid, mesh] of app.queryComponents(
		[Entity, app.c.MeshMixin] as const,
		Or(Added(app.c.MeshMixin), Changed(app.c.MeshMixin))
	)) {
		if (mesh.type !== 'three') {
			continue;
		}

		replaceMountedThreeObject(app, eid, mesh.object);
	}
}

export function syncThreeObjectTransformsSystem(app: TRenderApp) {
	for (const [eid, position, rotation, scale] of app.queryComponents(
		[Entity, app.c.PositionMixin, app.c.RotationMixin, app.c.ScaleMixin] as const,
		Or(
			Added(app.c.MeshMixin),
			Changed(app.c.MeshMixin),
			Added(app.c.PositionMixin),
			Changed(app.c.PositionMixin),
			Added(app.c.RotationMixin),
			Changed(app.c.RotationMixin),
			Added(app.c.ScaleMixin),
			Changed(app.c.ScaleMixin)
		)
	)) {
		const object = app.r.sceneObjects.get(eid);
		if (object == null) {
			continue;
		}

		syncThreeObjectTransform(object, { position, rotation, scale });
	}
}

export function cleanupOrphanedThreeObjectsSystem(app: TRenderApp) {
	const staleEntityIds = new Set<number>(app.queryEntities(Removed(app.c.MeshMixin)));

	for (const [eid] of app.r.sceneObjects) {
		if (!app.hasComponent(eid, app.c.MeshMixin)) {
			staleEntityIds.add(eid);
		}
	}

	for (const eid of staleEntityIds) {
		const object = app.r.sceneObjects.get(eid);
		if (object == null) {
			continue;
		}
		app.r.viewport.disposeObject(object);
		app.r.sceneObjects.delete(eid);
	}
}

export function syncPreviewCameraSystem(app: TRenderApp, delta = 0) {
	if (!app.r.previewConfig.enabled) {
		return;
	}

	const targetEntityId = app.r.previewState.targetEntityId;
	if (targetEntityId == null) {
		return;
	}

	const body = app.r.rigidBodies.get(targetEntityId);
	if (body == null) {
		return;
	}

	const translation = body.translation();
	const velocity = body.linvel();
	const desiredPose = computePreviewCameraPose(
		{
			x: translation.x,
			y: translation.y,
			z: translation.z
		},
		{
			x: velocity.x,
			y: velocity.y,
			z: velocity.z
		},
		app.r.previewState.lastFollowDirection,
		app.r.previewConfig,
		getPreviewSideSign(app.r.previewState.savedCameraSnapshot)
	);
	const currentSnapshot = app.r.viewport.getCameraSnapshot();
	const alpha = getPreviewSmoothingAlpha(app.r.previewConfig.smoothing, delta);

	app.r.viewport.setCameraPose(
		lerpVec3(currentSnapshot.position, desiredPose.position, alpha),
		lerpVec3(currentSnapshot.target, desiredPose.target, alpha),
		app.r.previewConfig.fov
	);

	if (!areVec3Close(app.r.previewState.lastFollowDirection, desiredPose.forward)) {
		app.r.previewState.lastFollowDirection = desiredPose.forward;
	}
}

export function renderFrameSystem(app: TRenderApp) {
	app.r.viewport.renderFrame();
}
