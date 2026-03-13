import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import type { TVec3 } from '../../types';
import type { TSceneEditorApp, TSceneEditorPlugin } from './types';
import type { TCStraightTrackGeometryMixin } from '../scene';
import {
	createTrackEditHandles,
	disposeTrackEditHandles,
	getTrackEndpoints,
	getTrackForward,
	getTrackHandleKind,
	resetTrackEditState,
	syncTrackEditHandlesSystem,
	trackEntityIds
} from './systems';

const dragPlaneNormal = new THREE.Vector3(1, 0, 0);
const zeroVec3: TVec3 = { x: 0, y: 0, z: 0 };

export function createSceneEditorPlugin(): TSceneEditorPlugin {
	const raycaster = new THREE.Raycaster();

	let onPointerDown: ((event: PointerEvent) => void) | null = null;
	let onPointerMove: ((event: PointerEvent) => void) | null = null;
	let onPointerUp: ((event: PointerEvent) => void) | null = null;

	return {
		name: 'SceneEditor',
		deps: ['Default', 'Core', 'Physics', 'Render', 'Scene'],
		resources: {
			editorSelection: {
				entityId: null,
				kind: null
			},
			trackEditState: resetTrackEditState(),
			trackEditConfig: {
				minLength: 6,
				maxLength: 28,
				handleRadius: 0.48,
				handleOffset: 0.8,
				dragStartPixels: 3
			},
			trackEditHandles: createTrackEditHandles(0.48)
		},
		appExtensions: {
			disposeSceneEditor(this: TSceneEditorApp): void {
				const canvas = this.r.viewport.domElement;
				if (onPointerDown != null) {
					canvas.removeEventListener('pointerdown', onPointerDown);
				}
				if (onPointerMove != null) {
					window.removeEventListener('pointermove', onPointerMove);
				}
				if (onPointerUp != null) {
					window.removeEventListener('pointerup', onPointerUp);
					window.removeEventListener('pointercancel', onPointerUp);
				}

				this.r.viewport.setControlsEnabled(true);
				disposeTrackEditHandles(this.r.trackEditHandles);
			}
		},
		setup(app: TSceneEditorApp) {
			const scene = app.r.viewport.scene;
			scene.add(app.r.trackEditHandles.start, app.r.trackEditHandles.end);

			onPointerDown = (event: PointerEvent) => handlePointerDown(app, raycaster, event);
			onPointerMove = (event: PointerEvent) => handlePointerMove(app, raycaster, event);
			onPointerUp = () => handlePointerUp(app);

			const canvas = app.r.viewport.domElement;
			canvas.addEventListener('pointerdown', onPointerDown);
			window.addEventListener('pointermove', onPointerMove);
			window.addEventListener('pointerup', onPointerUp);
			window.addEventListener('pointercancel', onPointerUp);

			app.addSystem(syncTrackEditHandlesSystem, { set: 'Update' });
		}
	};
}

function handlePointerDown(
	app: TSceneEditorApp,
	raycaster: THREE.Raycaster,
	event: PointerEvent
): void {
	const pointer = getNormalizedPointer(app, event);
	if (pointer == null) {
		return;
	}

	const pickedHandle = pickHandle(app, raycaster, pointer);
	const pickedTrack = pickTrack(app, raycaster, pointer);
	const pickedTarget = pickedHandle ?? pickedTrack;

	if (pickedTarget == null) {
		app.updateResource('editorSelection', { entityId: null, kind: null });
		app.updateResource('trackEditState', resetTrackEditState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	event.preventDefault();

	if (app.r.simulationTransport.mode === 'running') {
		app.updateResource('simulationTransport', {
			...app.r.simulationTransport,
			mode: 'paused'
		});
	}

	app.r.viewport.setControlsEnabled(false);

	const track = getTrackSnapshot(app, pickedTarget.entityId);
	if (track == null) {
		app.updateResource('trackEditState', resetTrackEditState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	app.updateResource('editorSelection', {
		entityId: pickedTarget.entityId,
		kind: 'straightTrack'
	});

	const planePoint = raycastTrackPlane(app, raycaster, pointer, track.position.x);
	if (planePoint == null) {
		app.updateResource('trackEditState', resetTrackEditState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	const mode =
		pickedTarget.target === 'handle-start'
			? 'resizeStart'
			: pickedTarget.target === 'handle-end'
				? 'resizeEnd'
				: 'move';
	const endpoints = getTrackEndpoints(track.position, track.rotation.x, track.geometry.length);
	const fixedEndpoint =
		mode === 'resizeStart'
			? toVec3(endpoints.end)
			: mode === 'resizeEnd'
				? toVec3(endpoints.start)
				: null;

	app.updateResource('trackEditState', resetTrackEditState({
		mode,
		entityId: pickedTarget.entityId,
		dragRevisionPending: true,
		pointerDownClient: { x: event.clientX, y: event.clientY },
		dragPlaneX: track.position.x,
		dragOffset:
			mode === 'move'
				? {
						x: 0,
						y: planePoint.y - track.position.y,
						z: planePoint.z - track.position.z
					}
				: zeroVec3,
		fixedEndpoint
	}));
}

function handlePointerMove(
	app: TSceneEditorApp,
	raycaster: THREE.Raycaster,
	event: PointerEvent
): void {
	const state = app.r.trackEditState;
	if (state.entityId == null || state.pointerDownClient == null || state.dragPlaneX == null) {
		return;
	}

	const pointer = getNormalizedPointer(app, event);
	if (pointer == null) {
		return;
	}

	const dx = event.clientX - state.pointerDownClient.x;
	const dy = event.clientY - state.pointerDownClient.y;
	const dragDistance = Math.hypot(dx, dy);
	if (!state.isDragging && dragDistance < app.r.trackEditConfig.dragStartPixels) {
		return;
	}

	const planePoint = raycastTrackPlane(app, raycaster, pointer, state.dragPlaneX);
	if (planePoint == null) {
		return;
	}

	const track = getTrackSnapshot(app, state.entityId);
	if (track == null) {
		return;
	}

	if (!state.isDragging) {
		app.updateResource('trackEditState', {
			...state,
			isDragging: true
		});
	}

	if (state.mode === 'move' && state.dragOffset != null) {
		const nextPosition = {
			x: track.position.x,
			y: planePoint.y - state.dragOffset.y,
			z: planePoint.z - state.dragOffset.z
		};
		if (!sameVec3(track.position, nextPosition)) {
			app.updateComponent(state.entityId, app.c.PositionMixin, nextPosition);
			markSceneEditInvalidation(app, state.dragRevisionPending);
		}
		return;
	}

	if (state.mode !== 'resizeStart' && state.mode !== 'resizeEnd') {
		return;
	}

	const fixedEndpoint = state.fixedEndpoint == null ? null : new THREE.Vector3(
		state.fixedEndpoint.x,
		state.fixedEndpoint.y,
		state.fixedEndpoint.z
	);
	if (fixedEndpoint == null) {
		return;
	}

	const draggedPoint = new THREE.Vector3(state.dragPlaneX, planePoint.y, planePoint.z);
	const nextGeometry = computeResizedTrack(track, state.mode, fixedEndpoint, draggedPoint, app);
	if (nextGeometry == null) {
		return;
	}

	if (!sameVec3(track.position, nextGeometry.position)) {
		app.updateComponent(state.entityId, app.c.PositionMixin, nextGeometry.position);
	}
	if (!sameVec3(track.rotation, nextGeometry.rotation)) {
		app.updateComponent(state.entityId, app.c.RotationMixin, nextGeometry.rotation);
	}
	if (track.geometry.length !== nextGeometry.length) {
		app.updateComponent(state.entityId, app.c.StraightTrackGeometryMixin, {
			...track.geometry,
			length: nextGeometry.length
		});
	}

	markSceneEditInvalidation(app, state.dragRevisionPending);
}

function handlePointerUp(app: TSceneEditorApp): void {
	const state = app.r.trackEditState;
	if (state.mode === 'idle' && app.r.viewport.controlsEnabled) {
		return;
	}

	app.updateResource('trackEditState', resetTrackEditState());
	app.updateResource('pendingSceneEditInvalidation', {
		...app.r.pendingSceneEditInvalidation,
		revisionBumped: false
	});
	app.r.viewport.setControlsEnabled(true);
}

function markSceneEditInvalidation(app: TSceneEditorApp, firstChangeInGesture: boolean): void {
	app.updateResource('pendingSceneEditInvalidation', {
		dirty: true,
		revisionBumped: firstChangeInGesture ? false : app.r.pendingSceneEditInvalidation.revisionBumped
	});

	if (firstChangeInGesture) {
		app.updateResource('trackEditState', {
			...app.r.trackEditState,
			dragRevisionPending: false
		});
	}
}

function pickHandle(
	app: TSceneEditorApp,
	raycaster: THREE.Raycaster,
	pointer: THREE.Vector2
): { entityId: number; target: 'handle-start' | 'handle-end' } | null {
	if (app.r.editorSelection.entityId == null) {
		return null;
	}

	raycaster.setFromCamera(pointer, app.r.viewport.camera);
	const intersections = raycaster.intersectObjects(
		[app.r.trackEditHandles.start, app.r.trackEditHandles.end].filter((handle) => handle.visible),
		false
	);
	const hit = intersections[0];
	const handleKind = getTrackHandleKind(hit?.object ?? null);
	if (handleKind == null) {
		return null;
	}

	return {
		entityId: app.r.editorSelection.entityId,
		target: handleKind === 'start' ? 'handle-start' : 'handle-end'
	};
}

function pickTrack(
	app: TSceneEditorApp,
	raycaster: THREE.Raycaster,
	pointer: THREE.Vector2
): { entityId: number; target: 'track' } | null {
	const objectMap = new Map<THREE.Object3D, number>();
	for (const eid of trackEntityIds(app)) {
		const object = app.r.sceneObjects.get(eid);
		if (object != null) {
			objectMap.set(object, eid);
		}
	}

	if (objectMap.size === 0) {
		return null;
	}

	raycaster.setFromCamera(pointer, app.r.viewport.camera);
	const intersections = raycaster.intersectObjects([...objectMap.keys()], false);
	for (const intersection of intersections) {
		const entityId = objectMap.get(intersection.object);
		if (entityId != null) {
			return { entityId, target: 'track' };
		}
	}

	return null;
}

function raycastTrackPlane(
	app: TSceneEditorApp,
	raycaster: THREE.Raycaster,
	pointer: THREE.Vector2,
	planeX: number
): THREE.Vector3 | null {
	raycaster.setFromCamera(pointer, app.r.viewport.camera);
	const plane = new THREE.Plane(dragPlaneNormal, -planeX);
	const point = new THREE.Vector3();
	return raycaster.ray.intersectPlane(plane, point);
}

function getNormalizedPointer(
	app: TSceneEditorApp,
	event: PointerEvent
): THREE.Vector2 | null {
	const rect = app.r.viewport.domElement.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) {
		return null;
	}

	return new THREE.Vector2(
		((event.clientX - rect.left) / rect.width) * 2 - 1,
		-((event.clientY - rect.top) / rect.height) * 2 + 1
	);
}

function getTrackSnapshot(app: TSceneEditorApp, entityId: number): {
	position: TVec3;
	rotation: TVec3;
	geometry: TCStraightTrackGeometryMixin;
} | null {
	for (const [eid, position, rotation, geometry] of app.queryComponents([
		Entity,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.StraightTrackGeometryMixin
	] as const, With(app.c.StraightTrackMixin))) {
		if (eid === entityId) {
			return {
				position,
				rotation,
				geometry
			};
		}
	}

	return null;
}

function computeResizedTrack(
	track: NonNullable<ReturnType<typeof getTrackSnapshot>>,
	mode: 'resizeStart' | 'resizeEnd',
	fixedEndpoint: THREE.Vector3,
	draggedPoint: THREE.Vector3,
	app: TSceneEditorApp
): { position: TVec3; rotation: TVec3; length: number } | null {
	const desiredDirection =
		mode === 'resizeStart'
			? fixedEndpoint.clone().sub(draggedPoint)
			: draggedPoint.clone().sub(fixedEndpoint);
	desiredDirection.x = 0;

	if (desiredDirection.lengthSq() < 1e-6) {
		desiredDirection.copy(getTrackForward(track.rotation.x));
	}

	desiredDirection.normalize();

	const rawLength = fixedEndpoint.distanceTo(draggedPoint);
	const length = THREE.MathUtils.clamp(
		rawLength,
		app.r.trackEditConfig.minLength,
		app.r.trackEditConfig.maxLength
	);

	let start = fixedEndpoint.clone();
	let end = fixedEndpoint.clone();
	if (mode === 'resizeStart') {
		start = fixedEndpoint.clone().sub(desiredDirection.clone().multiplyScalar(length));
		end = fixedEndpoint.clone();
	} else {
		start = fixedEndpoint.clone();
		end = fixedEndpoint.clone().add(desiredDirection.clone().multiplyScalar(length));
	}

	const center = start.clone().add(end).multiplyScalar(0.5);
	const forward = end.clone().sub(start).normalize();
	const rotationX = -Math.atan2(forward.y, forward.z);

	return {
		position: { x: track.position.x, y: center.y, z: center.z },
		rotation: { x: rotationX, y: 0, z: 0 },
		length
	};
}

function sameVec3(a: TVec3, b: TVec3): boolean {
	return (
		Math.abs(a.x - b.x) < 1e-5 &&
		Math.abs(a.y - b.y) < 1e-5 &&
		Math.abs(a.z - b.z) < 1e-5
	);
}

function toVec3(vector: THREE.Vector3): TVec3 {
	return {
		x: vector.x,
		y: vector.y,
		z: vector.z
	};
}
