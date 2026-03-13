import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import type { TSceneApp } from '../types';

const HANDLE_KIND_KEY = 'linearElementHandleKind';

export function createSceneManipulationHandles(
	handleRadius: number,
	handleColor: string
): { start: THREE.Mesh; end: THREE.Mesh } {
	const start = createSceneManipulationHandle(handleRadius, handleColor);
	start.userData[HANDLE_KIND_KEY] = 'start';
	start.visible = false;
	start.renderOrder = 10;

	const end = createSceneManipulationHandle(handleRadius, handleColor);
	end.userData[HANDLE_KIND_KEY] = 'end';
	end.visible = false;
	end.renderOrder = 10;

	return { start, end };
}

export function disposeSceneManipulationHandles(handles: {
	start: THREE.Mesh;
	end: THREE.Mesh;
}): void {
	for (const handle of [handles.start, handles.end]) {
		handle.parent?.remove(handle);
		handle.geometry.dispose();
		if (Array.isArray(handle.material)) {
			for (const material of handle.material) {
				material.dispose();
			}
		} else {
			handle.material.dispose();
		}
	}
}

export function getLinearElementHandleKind(object: THREE.Object3D | null): 'start' | 'end' | null {
	if (object == null) {
		return null;
	}

	const kind = object.userData[HANDLE_KIND_KEY];
	return kind === 'start' || kind === 'end' ? kind : null;
}

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

export function resetSceneManipulationState(
	patch: Partial<TSceneApp['r']['sceneManipulationState']> = {}
): TSceneApp['r']['sceneManipulationState'] {
	return {
		mode: 'idle',
		entityId: null,
		isDragging: false,
		pointerDownClient: null,
		dragPlaneX: null,
		dragOffset: null,
		...patch
	};
}

export function editableLinearEntityIds(app: TSceneApp): number[] {
	const ids: number[] = [];
	for (const [eid, sceneElement] of app.queryComponents(
		[Entity, app.c.SceneElementMixin] as const,
		With(app.c.LinearElementMixin)
	)) {
		if (sceneElement.editable) {
			ids.push(eid);
		}
	}

	return ids;
}

export function getEditableLinearElement(
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

export function updateHandleAppearance(
	handle: THREE.Mesh,
	handleRadius: number,
	handleColor: string
): void {
	handle.geometry.dispose();
	handle.geometry = new THREE.SphereGeometry(handleRadius, 24, 16);

	if (Array.isArray(handle.material)) {
		for (const material of handle.material) {
			material.dispose();
		}
		handle.material = new THREE.MeshBasicMaterial({ color: handleColor });
		return;
	}

	handle.material.dispose();
	handle.material = new THREE.MeshBasicMaterial({ color: handleColor });
}

function createSceneManipulationHandle(handleRadius: number, handleColor: string): THREE.Mesh {
	const geometry = new THREE.SphereGeometry(handleRadius, 24, 16);
	const material = new THREE.MeshBasicMaterial({
		color: handleColor
	});

	return new THREE.Mesh(geometry, material);
}
