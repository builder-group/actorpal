import * as THREE from 'three';
import type { TVec3 } from '../../../types';
import { createNotePlatformColliders, createNotePlatformGeometry } from '../bundles/note-platform';
import type { TCNotePlatformMixin, TSceneApp } from '../types';
import { getNotePlatformGeometryKey, resolveNotePlatformTransform } from './note-platform';
import { sameVec3 } from './vec3';

export function syncResolvedNotePlatform(
	app: TSceneApp,
	entityId: number,
	platform: TCNotePlatformMixin,
	position: TVec3,
	rotation: TVec3,
	colliderDescriptors: TSceneApp['c']['ColliderMixin'][number]['descriptors'],
	meshObject: THREE.Object3D | null,
	anchorPosition: TVec3
): boolean {
	const transform = resolveNotePlatformTransform(
		anchorPosition,
		platform.offsetY,
		platform.offsetZ,
		platform.rotationX,
		platform.thickness,
		platform.width
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
		if (meshObject instanceof THREE.Mesh) {
			const nextGeometryKey = getNotePlatformGeometryKey(platform);
			if (meshObject.geometry.userData['notePlatformGeometryKey'] !== nextGeometryKey) {
				meshObject.geometry.dispose();
				meshObject.geometry = createNotePlatformGeometry(platform);
				didRuntimeChange = true;
			}
			if (meshObject.material instanceof THREE.MeshStandardMaterial) {
				meshObject.material.color.set(platform.color);
			}
		}
	}

	const nextDescriptors = createNotePlatformColliders(platform);
	if (!areColliderDescriptorsEqual(colliderDescriptors, nextDescriptors)) {
		app.updateComponent(entityId, app.c.ColliderMixin, {
			descriptors: nextDescriptors
		});
		didRuntimeChange = true;
	}

	return didRuntimeChange;
}

function areColliderDescriptorsEqual(
	left: TSceneApp['c']['ColliderMixin'][number]['descriptors'],
	right: TSceneApp['c']['ColliderMixin'][number]['descriptors']
): boolean {
	if (left.length !== right.length) {
		return false;
	}

	for (let index = 0; index < left.length; index += 1) {
		const leftEntry = left[index];
		const rightEntry = right[index];
		if (
			leftEntry == null ||
			rightEntry == null ||
			!areColliderDescriptorEntriesEqual(leftEntry, rightEntry)
		) {
			return false;
		}
	}

	return true;
}

function areColliderDescriptorEntriesEqual(
	left: TSceneApp['c']['ColliderMixin'][number]['descriptors'][number],
	right: TSceneApp['c']['ColliderMixin'][number]['descriptors'][number]
): boolean {
	if (
		left.shape !== right.shape ||
		left.friction !== right.friction ||
		left.restitution !== right.restitution ||
		left.restitutionCombineRule !== right.restitutionCombineRule ||
		left.density !== right.density ||
		left.sensor !== right.sensor ||
		!sameOptionalVec3(left.translation, right.translation) ||
		!sameOptionalVec3(left.rotation, right.rotation)
	) {
		return false;
	}

	if (left.shape === 'ball' && right.shape === 'ball') {
		return left.radius === right.radius;
	}

	if (left.shape === 'cuboid' && right.shape === 'cuboid') {
		return sameVec3(left.halfExtents, right.halfExtents);
	}

	return false;
}

function sameOptionalVec3(left?: TVec3, right?: TVec3): boolean {
	if (left == null || right == null) {
		return left == null && right == null;
	}

	return sameVec3(left, right);
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
