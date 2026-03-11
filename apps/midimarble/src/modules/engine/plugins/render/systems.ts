import { Entity, With } from 'ecsify';
import type { TRenderApp } from './types';

export function mountThreeObjectsSystem(app: TRenderApp) {
	for (const [eid, mesh] of app.queryComponents(
		[Entity, app.c.MeshMixin] as const,
		With(app.c.MeshMixin)
	)) {
		if (app.r.sceneObjects.has(eid)) {
			continue;
		}

		if (mesh.type !== 'three') {
			continue;
		}

		app.r.viewport.scene.add(mesh.object);
		app.r.viewport.trackObject(mesh.object);
		app.r.sceneObjects.set(eid, mesh.object);
	}
}

export function syncThreeObjectTransformsSystem(app: TRenderApp) {
	for (const [eid, position, rotation, scale] of app.queryComponents([
		Entity,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.ScaleMixin
	] as const)) {
		const object = app.r.sceneObjects.get(eid);
		if (object == null) {
			continue;
		}

		object.position.set(position.x, position.y, position.z);
		object.rotation.set(rotation.x, rotation.y, rotation.z);
		object.scale.set(scale.x, scale.y, scale.z);
	}
}

export function cleanupOrphanedThreeObjectsSystem(app: TRenderApp) {
	const activeEntities = new Set(app.queryEntities(With(app.c.MeshMixin)));

	for (const [eid, object] of app.r.sceneObjects) {
		if (activeEntities.has(eid)) {
			continue;
		}

		app.r.viewport.disposeObject(object);
		app.r.sceneObjects.delete(eid);
	}
}

export function renderFrameSystem(app: TRenderApp) {
	app.r.viewport.renderFrame();
}
