import * as THREE from 'three';
import type { TVec3 } from '../../../types';
import {
	createNotePlatformColliders,
	createNotePlatformGeometry
} from '../bundles/note-platform';
import { resolveNotePlatformTransform } from './note-platform';
import { sameVec3 } from './vec3';
import type { TSceneApp, TCNotePlatformMixin } from '../types';

export function syncResolvedNotePlatform(
	app: TSceneApp,
	entityId: number,
	platform: TCNotePlatformMixin,
	position: TVec3,
	rotation: TVec3,
	colliderDescriptors: TSceneApp['c']['ColliderMixin'][number]['descriptors'],
	meshObject: THREE.Object3D | null,
	anchorPosition: TVec3,
	shapeChanged: boolean
): boolean {
	const transform = resolveNotePlatformTransform(
		anchorPosition,
		platform.rotationX,
		platform.thickness
	);
	let didRuntimeChange = false;

	if (!sameVec3(position, transform.position)) {
		app.updateComponent(entityId, app.c.PositionMixin, transform.position);
		didRuntimeChange = true;
	}

	if (!sameVec3(rotation, transform.rotation)) {
		app.updateComponent(entityId, app.c.RotationMixin, transform.rotation);
		didRuntimeChange = true;
	}

	if (meshObject != null) {
		if (!meshObject.visible) {
			meshObject.visible = true;
			didRuntimeChange = true;
		}
		meshObject.position.set(transform.position.x, transform.position.y, transform.position.z);
		meshObject.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
		if (meshObject instanceof THREE.Mesh && shapeChanged) {
			meshObject.geometry.dispose();
			meshObject.geometry = createNotePlatformGeometry(platform);
			if (meshObject.material instanceof THREE.MeshStandardMaterial) {
				meshObject.material.color.set(platform.color);
			}
		}
	}

	const nextDescriptors = createNotePlatformColliders(platform);
	if (shapeChanged || colliderDescriptors.length === 0) {
		app.updateComponent(entityId, app.c.ColliderMixin, {
			descriptors: nextDescriptors
		});
		didRuntimeChange = true;
	}

	return didRuntimeChange;
}

export function syncUnresolvedNotePlatform(
	app: TSceneApp,
	entityId: number,
	colliderDescriptors: TSceneApp['c']['ColliderMixin'][number]['descriptors'],
	meshObject: THREE.Object3D | null
): boolean {
	let didRuntimeChange = false;
	if (meshObject != null) {
		if (meshObject.visible) {
			didRuntimeChange = true;
		}
		meshObject.visible = false;
	}

	if (colliderDescriptors.length > 0) {
		app.updateComponent(entityId, app.c.ColliderMixin, {
			descriptors: []
		});
		didRuntimeChange = true;
	}

	return didRuntimeChange;
}
