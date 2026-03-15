import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import type { TSceneApp } from '../types';

export function getLinearElementForward(rotationX: number): THREE.Vector3 {
	return new THREE.Vector3(0, -Math.sin(rotationX), Math.cos(rotationX)).normalize();
}

export function getLinearElementEndpoints(
	position: { x: number; y: number; z: number },
	rotationX: number,
	length: number
): { start: THREE.Vector3; end: THREE.Vector3 } {
	const center = new THREE.Vector3(position.x, position.y, position.z);
	const halfForward = getLinearElementForward(rotationX).multiplyScalar(length * 0.5);
	return {
		start: center.clone().sub(halfForward),
		end: center.clone().add(halfForward)
	};
}

export function getLinearElementHandlePositions(
	position: { x: number; y: number; z: number },
	rotationX: number,
	length: number,
	handleOffset: number
): { start: THREE.Vector3; end: THREE.Vector3 } {
	const endpoints = getLinearElementEndpoints(position, rotationX, length);
	const offset = getLinearElementForward(rotationX).multiplyScalar(handleOffset);

	return {
		start: endpoints.start.clone().sub(offset),
		end: endpoints.end.clone().add(offset)
	};
}

export function getLinearElementEntityIds(app: TSceneApp): number[] {
	return app.queryEntities(With(app.c.LinearElementMixin));
}

export function getLinearElement(
	app: TSceneApp,
	entityId: number
): {
	transform: TSceneApp['c']['AuthoredTransformMixin'][number];
	linear: TSceneApp['c']['LinearElementMixin'][number];
} | null {
	for (const [eid, transform, linear] of app.queryComponents(
		[Entity, app.c.AuthoredTransformMixin, app.c.LinearElementMixin] as const,
		With(app.c.LinearElementMixin)
	)) {
		if (eid === entityId) {
			return { transform, linear };
		}
	}

	return null;
}
