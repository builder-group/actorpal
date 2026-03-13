import * as THREE from 'three';
import type { TVec3 } from '../../types';
import {
	disposeSceneManipulationHandles,
	editableLinearEntityIds,
	getEditableLinearElement,
	getLinearElementHandleKind,
	getLinearElementHandlePositions,
	resetSceneManipulationState
} from './lib/manipulation';
import { computeLinearResizeResult, getDraggedHandlePoint } from './manipulation-math';
import type { TSceneApp } from './types';

const dragPlaneNormal = new THREE.Vector3(1, 0, 0);

type TSceneCleanup = () => void;

export function setupSceneManipulation(app: TSceneApp): TSceneCleanup {
	const raycaster = new THREE.Raycaster();
	const scene = app.r.viewport.scene;
	scene.add(app.r.sceneManipulationHandles.start, app.r.sceneManipulationHandles.end);

	const onPointerDown = (event: PointerEvent) => handlePointerDown(app, raycaster, event);
	const onPointerMove = (event: PointerEvent) => handlePointerMove(app, raycaster, event);
	const onPointerUp = () => handlePointerUp(app);

	const canvas = app.r.viewport.domElement;
	canvas.addEventListener('pointerdown', onPointerDown);
	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('pointerup', onPointerUp);
	window.addEventListener('pointercancel', onPointerUp);

	return () => {
		canvas.removeEventListener('pointerdown', onPointerDown);
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
		window.removeEventListener('pointercancel', onPointerUp);
		app.r.viewport.setControlsEnabled(true);
		disposeSceneManipulationHandles(app.r.sceneManipulationHandles);
	};
}

function handlePointerDown(app: TSceneApp, raycaster: THREE.Raycaster, event: PointerEvent): void {
	const pointer = getNormalizedPointer(app, event);
	if (pointer == null) {
		return;
	}

	const pickedHandle = pickHandle(app, raycaster, pointer);
	const pickedElement = pickLinearElement(app, raycaster, pointer);
	const pickedTarget = pickedHandle ?? pickedElement;

	if (pickedTarget == null) {
		app.updateResource('sceneSelection', { entityId: null });
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	event.preventDefault();
	app.r.viewport.setControlsEnabled(false);

	const linearElement = getEditableLinearElement(app, pickedTarget.entityId);
	if (linearElement == null) {
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	app.updateResource('sceneSelection', {
		entityId: pickedTarget.entityId
	});

	const planePoint = raycastScenePlane(app, raycaster, pointer, linearElement.transform.position.x);
	if (planePoint == null) {
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	const mode =
		pickedTarget.target === 'handle-start'
			? 'resizeStart'
			: pickedTarget.target === 'handle-end'
				? 'resizeEnd'
				: 'move';
	const handlePositions = getLinearElementHandlePositions(
		linearElement.transform.position,
		linearElement.transform.rotation.x,
		linearElement.linear.length,
		linearElement.linear.handleOffset
	);
	const dragAnchor =
		mode === 'move'
			? linearElement.transform.position
			: mode === 'resizeStart'
				? toVec3(handlePositions.start)
				: toVec3(handlePositions.end);

	app.updateResource(
		'sceneManipulationState',
		resetSceneManipulationState({
			mode,
			entityId: pickedTarget.entityId,
			pointerDownClient: { x: event.clientX, y: event.clientY },
			dragPlaneX: linearElement.transform.position.x,
			dragOffset: {
				x: 0,
				y: planePoint.y - dragAnchor.y,
				z: planePoint.z - dragAnchor.z
			}
		})
	);
}

function handlePointerMove(app: TSceneApp, raycaster: THREE.Raycaster, event: PointerEvent): void {
	const state = app.r.sceneManipulationState;
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
	if (!state.isDragging && dragDistance < app.r.sceneManipulationConfig.dragStartPixels) {
		return;
	}

	const planePoint = raycastScenePlane(app, raycaster, pointer, state.dragPlaneX);
	if (planePoint == null) {
		return;
	}

	const linearElement = getEditableLinearElement(app, state.entityId);
	if (linearElement == null) {
		return;
	}

	if (!state.isDragging) {
		app.updateResource('sceneManipulationState', {
			...state,
			isDragging: true
		});
	}

	if (state.mode === 'move' && state.dragOffset != null) {
		const nextPosition = {
			x: linearElement.transform.position.x,
			y: planePoint.y - state.dragOffset.y,
			z: planePoint.z - state.dragOffset.z
		};
		if (!sameVec3(linearElement.transform.position, nextPosition)) {
			app.updateComponent(state.entityId, app.c.AuthoredTransformMixin, {
				...linearElement.transform,
				position: nextPosition
			});
			app.markSimulationDirty();
		}
		return;
	}

	if (state.mode !== 'resizeStart' && state.mode !== 'resizeEnd') {
		return;
	}

	const draggedPoint = getDraggedHandlePoint(state.dragPlaneX, planePoint, state.dragOffset);
	const resized = computeLinearResizeResult(
		{
			position: linearElement.transform.position,
			rotation: linearElement.transform.rotation,
			minLength: linearElement.linear.minLength,
			maxLength: linearElement.linear.maxLength,
			handleOffset: linearElement.linear.handleOffset
		},
		state.mode,
		draggedPoint
	);

	let didChange = false;
	if (
		!sameVec3(linearElement.transform.position, resized.position) ||
		!sameVec3(linearElement.transform.rotation, resized.rotation)
	) {
		app.updateComponent(state.entityId, app.c.AuthoredTransformMixin, {
			...linearElement.transform,
			position: resized.position,
			rotation: resized.rotation
		});
		didChange = true;
	}
	if (linearElement.linear.length !== resized.length) {
		app.updateComponent(state.entityId, app.c.LinearElementMixin, {
			...linearElement.linear,
			length: resized.length
		});
		didChange = true;
	}

	if (didChange) {
		app.markSimulationDirty();
	}
}

function handlePointerUp(app: TSceneApp): void {
	const state = app.r.sceneManipulationState;
	if (state.mode === 'idle' && app.r.viewport.controlsEnabled) {
		return;
	}

	app.updateResource('sceneManipulationState', resetSceneManipulationState());
	app.requestSimulationSync();
	app.r.viewport.setControlsEnabled(true);
}

function pickHandle(
	app: TSceneApp,
	raycaster: THREE.Raycaster,
	pointer: THREE.Vector2
): { entityId: number; target: 'handle-start' | 'handle-end' } | null {
	if (app.r.sceneSelection.entityId == null) {
		return null;
	}

	raycaster.setFromCamera(pointer, app.r.viewport.camera);
	const intersections = raycaster.intersectObjects(
		[app.r.sceneManipulationHandles.start, app.r.sceneManipulationHandles.end].filter(
			(handle) => handle.visible
		),
		false
	);
	const hit = intersections[0];
	const handleKind = getLinearElementHandleKind(hit?.object ?? null);
	if (handleKind == null) {
		return null;
	}

	return {
		entityId: app.r.sceneSelection.entityId,
		target: handleKind === 'start' ? 'handle-start' : 'handle-end'
	};
}

function pickLinearElement(
	app: TSceneApp,
	raycaster: THREE.Raycaster,
	pointer: THREE.Vector2
): { entityId: number; target: 'element' } | null {
	const objectMap = new Map<THREE.Object3D, number>();
	for (const eid of editableLinearEntityIds(app)) {
		const object = app.r.sceneObjects.get(eid);
		if (object != null) {
			objectMap.set(object, eid);
		}
	}

	if (objectMap.size === 0) {
		return null;
	}

	raycaster.setFromCamera(pointer, app.r.viewport.camera);
	const intersections = raycaster.intersectObjects([...objectMap.keys()], true);
	for (const intersection of intersections) {
		let current: THREE.Object3D | null = intersection.object;
		while (current != null) {
			const entityId = objectMap.get(current);
			if (entityId != null) {
				return { entityId, target: 'element' };
			}
			current = current.parent;
		}
	}

	return null;
}

function raycastScenePlane(
	app: TSceneApp,
	raycaster: THREE.Raycaster,
	pointer: THREE.Vector2,
	planeX: number
): THREE.Vector3 | null {
	raycaster.setFromCamera(pointer, app.r.viewport.camera);
	const plane = new THREE.Plane(dragPlaneNormal, -planeX);
	const point = new THREE.Vector3();
	return raycaster.ray.intersectPlane(plane, point);
}

function getNormalizedPointer(app: TSceneApp, event: PointerEvent): THREE.Vector2 | null {
	const rect = app.r.viewport.domElement.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) {
		return null;
	}

	return new THREE.Vector2(
		((event.clientX - rect.left) / rect.width) * 2 - 1,
		-((event.clientY - rect.top) / rect.height) * 2 + 1
	);
}

function sameVec3(a: TVec3, b: TVec3): boolean {
	return Math.abs(a.x - b.x) < 1e-5 && Math.abs(a.y - b.y) < 1e-5 && Math.abs(a.z - b.z) < 1e-5;
}

function toVec3(vector: THREE.Vector3): TVec3 {
	return {
		x: vector.x,
		y: vector.y,
		z: vector.z
	};
}
