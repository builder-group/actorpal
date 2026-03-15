import { With } from 'ecsify';
import * as THREE from 'three';
import type { TSceneApp } from '../types';
import { getLinearElementEntityIds } from './linear-element';
import {
	disposeSceneManipulationHandles,
	getLinearElementHandleKind
} from './manipulation-handles';
import { resetSceneManipulationState } from './manipulation-state';
import {
	beginSceneManipulation,
	getSceneManipulationPlaneX,
	updateSceneManipulation
} from './scene-manipulation-adapters';
import { clearSceneEntitySelection, selectSceneEntity } from './scene-selection';

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
	if (app.r.previewConfig.enabled) {
		return;
	}

	const pointer = getNormalizedPointer(app, event);
	if (pointer == null) {
		return;
	}

	const pickedHandle = pickHandle(app, raycaster, pointer);
	const pickedElement = pickSceneElement(app, raycaster, pointer);
	const pickedTarget = pickedHandle ?? pickedElement;

	if (pickedTarget == null) {
		app.selectNote(null);
		clearSceneEntitySelection(app);
		return;
	}

	event.preventDefault();

	if (pickedTarget.target === 'marble') {
		selectSceneEntity(app, pickedTarget.entityId);
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	if (pickedTarget.target === 'note-platform') {
		selectSceneEntity(app, pickedTarget.entityId);
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	app.r.viewport.setControlsEnabled(false);

	const dragPlaneX = getSceneManipulationPlaneX(app, pickedTarget.entityId);
	if (dragPlaneX == null) {
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	const planePoint = raycastScenePlane(app, raycaster, pointer, dragPlaneX);
	if (planePoint == null) {
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	const nextState = beginSceneManipulation(
		app,
		pickedTarget,
		{ x: event.clientX, y: event.clientY },
		planePoint
	);
	if (nextState == null) {
		app.updateResource('sceneManipulationState', resetSceneManipulationState());
		app.r.viewport.setControlsEnabled(true);
		return;
	}

	selectSceneEntity(app, pickedTarget.entityId);
	app.updateResource('sceneManipulationState', nextState);
}

function handlePointerMove(app: TSceneApp, raycaster: THREE.Raycaster, event: PointerEvent): void {
	if (app.r.previewConfig.enabled) {
		return;
	}

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

	if (!state.isDragging) {
		app.updateResource('sceneManipulationState', {
			...state,
			isDragging: true
		});
	}

	updateSceneManipulation(app, state.entityId, state, planePoint);
}

function handlePointerUp(app: TSceneApp): void {
	const state = app.r.sceneManipulationState;
	if (state.mode === 'idle' && app.r.viewport.controlsEnabled) {
		return;
	}

	if (state.didEdit) {
		app.markSimulationDirty();
		app.requestSimulationSync();
		app.setSceneEditPending(false);
	}

	app.updateResource('sceneManipulationState', resetSceneManipulationState());
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

function pickSceneElement(
	app: TSceneApp,
	raycaster: THREE.Raycaster,
	pointer: THREE.Vector2
): { entityId: number; target: 'element' | 'marble' | 'note-platform' } | null {
	const objectMap = new Map<THREE.Object3D, number>();
	for (const eid of getLinearElementEntityIds(app)) {
		const object = app.r.sceneObjects.get(eid);
		if (object != null) {
			objectMap.set(object, eid);
		}
	}
	for (const eid of app.queryEntities(With(app.c.NotePlatformMixin))) {
		const object = app.r.sceneObjects.get(eid);
		if (object != null) {
			objectMap.set(object, eid);
		}
	}
	for (const eid of app.queryEntities(With(app.c.MarbleTag))) {
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
				return app.hasComponent(entityId, app.c.MarbleTag)
					? { entityId, target: 'marble' }
					: app.hasComponent(entityId, app.c.NotePlatformMixin)
						? { entityId, target: 'note-platform' }
						: { entityId, target: 'element' };
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
