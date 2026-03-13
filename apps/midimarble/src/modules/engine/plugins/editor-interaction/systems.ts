import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import type { TTrackEditState, TSceneEditorApp } from './types';
import type {
	TCPositionMixin,
	TCRotationMixin
} from '../core';
import type { TCStraightTrackGeometryMixin } from '../scene';

const HANDLE_COLOR = '#facc15';
const HANDLE_KIND_KEY = 'trackHandleKind';

export function syncTrackEditHandlesSystem(app: TSceneEditorApp) {
	const selection = app.r.editorSelection;
	const handles = app.r.trackEditHandles;

	if (selection.kind !== 'straightTrack' || selection.entityId == null) {
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

	let geometry: TCStraightTrackGeometryMixin | null = null;
	let position: TCPositionMixin | null = null;
	let rotation: TCRotationMixin | null = null;
	for (const [eid, nextPosition, nextRotation, nextGeometry] of app.queryComponents([
		Entity,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.StraightTrackGeometryMixin
	] as const, With(app.c.StraightTrackMixin))) {
		if (eid !== selection.entityId) {
			continue;
		}

		position = nextPosition;
		rotation = nextRotation;
		geometry = nextGeometry;
		break;
	}
	if (geometry == null || position == null || rotation == null) {
		app.updateResource('editorSelection', { entityId: null, kind: null });
		handles.start.visible = false;
		handles.end.visible = false;
		return;
	}

	const endpoints = getTrackEndpoints(position, rotation.x, geometry.length);
	const forward = getTrackForward(rotation.x);
	const offset = forward.clone().multiplyScalar(app.r.trackEditConfig.handleOffset);

	handles.start.position.copy(endpoints.start.clone().sub(offset));
	handles.end.position.copy(endpoints.end.clone().add(offset));
	handles.start.visible = true;
	handles.end.visible = true;
}

export function createTrackEditHandles(handleRadius: number): { start: THREE.Mesh; end: THREE.Mesh } {
	const geometry = new THREE.SphereGeometry(handleRadius, 24, 24);
	const material = new THREE.MeshStandardMaterial({
		color: HANDLE_COLOR,
		roughness: 0.42,
		metalness: 0.08
	});

	const start = new THREE.Mesh(geometry.clone(), material.clone());
	start.userData[HANDLE_KIND_KEY] = 'start';
	start.visible = false;
	start.castShadow = true;
	start.receiveShadow = true;

	const end = new THREE.Mesh(geometry.clone(), material.clone());
	end.userData[HANDLE_KIND_KEY] = 'end';
	end.visible = false;
	end.castShadow = true;
	end.receiveShadow = true;

	return { start, end };
}

export function disposeTrackEditHandles(handles: { start: THREE.Mesh; end: THREE.Mesh }): void {
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

export function getTrackHandleKind(object: THREE.Object3D | null): 'start' | 'end' | null {
	if (object == null) {
		return null;
	}

	const kind = object.userData[HANDLE_KIND_KEY];
	return kind === 'start' || kind === 'end' ? kind : null;
}

export function getTrackForward(rotationX: number): THREE.Vector3 {
	return new THREE.Vector3(0, -Math.sin(rotationX), Math.cos(rotationX)).normalize();
}

export function getTrackEndpoints(
	position: { x: number; y: number; z: number },
	rotationX: number,
	length: number
): { start: THREE.Vector3; end: THREE.Vector3 } {
	const center = new THREE.Vector3(position.x, position.y, position.z);
	const halfForward = getTrackForward(rotationX).multiplyScalar(length * 0.5);
	return {
		start: center.clone().sub(halfForward),
		end: center.clone().add(halfForward)
	};
}

export function resetTrackEditState(patch: Partial<TTrackEditState> = {}): TTrackEditState {
	return {
		mode: 'idle',
		entityId: null,
		isDragging: false,
		dragRevisionPending: false,
		pointerDownClient: null,
		dragPlaneX: null,
		dragOffset: null,
		fixedEndpoint: null,
		...patch
	};
}

export function trackEntityIds(app: TSceneEditorApp): number[] {
	return app.queryEntities(With(app.c.StraightTrackMixin));
}
