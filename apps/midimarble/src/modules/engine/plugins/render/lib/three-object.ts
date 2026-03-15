import type * as THREE from 'three';
import type { TRenderApp } from '../types';

export function syncThreeObjectTransform(
	object: THREE.Object3D,
	transform: {
		position: { x: number; y: number; z: number };
		rotation: { x: number; y: number; z: number };
		scale: { x: number; y: number; z: number };
	}
): void {
	object.position.set(transform.position.x, transform.position.y, transform.position.z);
	object.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
	object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
}

export function replaceMountedThreeObject(
	app: TRenderApp,
	eid: number,
	nextObject: THREE.Object3D
): void {
	const prevObject = app.r.sceneObjects.get(eid);
	if (prevObject === nextObject) {
		return;
	}

	if (prevObject != null) {
		app.r.viewport.disposeObject(prevObject);
	}

	app.r.viewport.scene.add(nextObject);
	app.r.viewport.trackObject(nextObject);
	app.r.sceneObjects.set(eid, nextObject);
}
