import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import { createStraightTrackColliders, createStraightTrackGeometry } from './scene-bundles';
import type { TSceneApp, TCStraightTrackGeometryMixin } from './types';

export function syncStraightTrackGeometrySystem(app: TSceneApp) {
	const activeTrackEntities = new Set<number>();

	for (const [eid, geometry, mesh] of app.queryComponents([
		Entity,
		app.c.StraightTrackGeometryMixin,
		app.c.MeshMixin
	] as const, With(app.c.StraightTrackMixin))) {
		activeTrackEntities.add(eid);

		const signature = createTrackGeometrySignature(geometry);
		const prevSignature = app.r.straightTrackGeometrySignatures.get(eid);
		if (prevSignature == null) {
			app.r.straightTrackGeometrySignatures.set(eid, signature);
			continue;
		}

		if (prevSignature === signature || mesh.type !== 'three' || !(mesh.object instanceof THREE.Mesh)) {
			continue;
		}

		const nextGeometry = createStraightTrackGeometry(geometry);
		mesh.object.geometry.dispose();
		mesh.object.geometry = nextGeometry;

		const material = mesh.object.material;
		if (Array.isArray(material)) {
			for (const entry of material) {
				if ('color' in entry) {
					entry.color.set(geometry.color);
				}
			}
		} else if (material instanceof THREE.MeshStandardMaterial) {
			material.color.set(geometry.color);
		}

		app.updateComponent(eid, app.c.ColliderMixin, {
			descriptors: createStraightTrackColliders(geometry)
		});
		app.r.straightTrackGeometrySignatures.set(eid, signature);
	}

	for (const eid of Array.from(app.r.straightTrackGeometrySignatures.keys())) {
		if (!activeTrackEntities.has(eid)) {
			app.r.straightTrackGeometrySignatures.delete(eid);
		}
	}
}

function createTrackGeometrySignature(track: TCStraightTrackGeometryMixin): string {
	return JSON.stringify([
		track.length,
		track.height,
		track.width,
		track.channelWidth,
		track.channelDepth,
		track.color
	]);
}
