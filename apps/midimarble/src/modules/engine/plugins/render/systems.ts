import { Entity, With } from 'ecsify';
import { createMeshObject } from './lib';
import type { TRenderApp } from './types';

export function spawnMeshObjectsSystem(app: TRenderApp) {
	for (const [eid, mesh] of app.queryComponents(
		[Entity, app.c.MeshMixin] as const,
		With(app.c.MeshMixin)
	)) {
		if (app.r.meshObjects.has(eid)) {
			continue;
		}

		const object = createMeshObject(mesh.ref, app);
		if (object != null) {
			app.r.viewport.scene.add(object);
			app.r.viewport.trackObject(object);
		}
		app.r.meshObjects.set(eid, object);
	}
}

export function syncMeshTransformsSystem(app: TRenderApp) {
	for (const [eid, position, rotation, scale] of app.queryComponents([
		Entity,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.ScaleMixin
	] as const)) {
		const object = app.r.meshObjects.get(eid) ?? null;
		if (object == null) {
			continue;
		}

		object.position.set(position.x, position.y, position.z);
		object.rotation.set(rotation.x, rotation.y, rotation.z);
		object.scale.set(scale.x, scale.y, scale.z);
	}
}

export function cleanupOrphanedMeshObjectsSystem(app: TRenderApp) {
	const activeMeshEntities = new Set(app.queryEntities(With(app.c.MeshMixin)));

	for (const [eid, object] of app.r.meshObjects) {
		if (activeMeshEntities.has(eid)) {
			continue;
		}

		app.r.viewport.disposeObject(object);
		app.r.meshObjects.delete(eid);
	}
}

export function renderFrameSystem(app: TRenderApp) {
	app.r.viewport.renderFrame();
}
