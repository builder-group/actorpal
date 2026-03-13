import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import { createStraightTrackColliders, createStraightTrackGeometry } from './scene-bundles';
import type { TCStraightTrackMixin, TSceneApp } from './types';

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

export function syncStraightTrackGeometrySystem(app: TSceneApp) {
	const activeTrackEntities = new Set<number>();

	for (const [eid, linear, track, mesh] of app.queryComponents(
		[Entity, app.c.LinearElementMixin, app.c.StraightTrackMixin, app.c.MeshMixin] as const,
		With(app.c.StraightTrackMixin)
	)) {
		activeTrackEntities.add(eid);

		const signature = createTrackGeometrySignature(linear.length, track);
		const prevSignature = app.r.straightTrackGeometrySignatures.get(eid);
		if (prevSignature == null) {
			app.r.straightTrackGeometrySignatures.set(eid, signature);
			continue;
		}

		if (
			prevSignature === signature ||
			mesh.type !== 'three' ||
			!(mesh.object instanceof THREE.Mesh)
		) {
			continue;
		}

		const nextGeometry = createStraightTrackGeometry({ ...track, length: linear.length });
		mesh.object.geometry.dispose();
		mesh.object.geometry = nextGeometry;

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

		app.updateComponent(eid, app.c.ColliderMixin, {
			descriptors: createStraightTrackColliders({ ...track, length: linear.length })
		});
		app.r.straightTrackGeometrySignatures.set(eid, signature);
	}

	for (const eid of Array.from(app.r.straightTrackGeometrySignatures.keys())) {
		if (!activeTrackEntities.has(eid)) {
			app.r.straightTrackGeometrySignatures.delete(eid);
		}
	}
}

function createTrackGeometrySignature(length: number, track: TCStraightTrackMixin): string {
	return JSON.stringify([
		length,
		track.height,
		track.width,
		track.channelWidth,
		track.channelDepth,
		track.color
	]);
}

function sameVec3(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
	return Math.abs(a.x - b.x) < 1e-5 && Math.abs(a.y - b.y) < 1e-5 && Math.abs(a.z - b.z) < 1e-5;
}
