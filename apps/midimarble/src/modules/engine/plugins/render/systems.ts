import { Added, Changed, Entity, Or, Removed } from 'ecsify';
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
	for (const eid of app.queryEntities(Removed(app.c.MeshMixin))) {
		const object = app.r.sceneObjects.get(eid);
		if (object == null) {
			continue;
		}
		app.r.viewport.disposeObject(object);
		app.r.sceneObjects.delete(eid);
	}
}

export function renderFrameSystem(app: TRenderApp) {
	app.r.viewport.renderFrame();
}
