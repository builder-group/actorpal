import type * as THREE from 'three';
import type { TSceneApp } from '../types';
import { getLinearElement, getLinearElementHandlePositions } from './linear-element';
import { computeLinearResizeResult, getDraggedHandlePoint } from './manipulation-math';
import { resetSceneManipulationState } from './manipulation-state';
import {
	getNotePlatform,
	NOTE_PLATFORM_HANDLE_OFFSET,
	NOTE_PLATFORM_LIMITS
} from './note-platform';
import { sameVec3 } from './vec3';

export type TSceneManipulationPickTarget =
	| 'element'
	| 'note-platform'
	| 'marble'
	| 'handle-start'
	| 'handle-end';

export interface TSceneManipulationPick {
	entityId: number;
	target: TSceneManipulationPickTarget;
}

interface TSceneManipulationAdapter {
	getPlaneX(app: TSceneApp, entityId: number): number | null;
	begin(
		app: TSceneApp,
		pickedTarget: TSceneManipulationPick,
		pointerDownClient: { x: number; y: number },
		dragPlaneX: number,
		planePoint: THREE.Vector3
	): TSceneApp['r']['sceneManipulationState'] | null;
	update(
		app: TSceneApp,
		entityId: number,
		state: TSceneApp['r']['sceneManipulationState'],
		planePoint: THREE.Vector3
	): boolean;
}

const linearElementManipulationAdapter: TSceneManipulationAdapter = {
	getPlaneX(app, entityId) {
		return getLinearElement(app, entityId)?.transform.position.x ?? null;
	},
	begin(app, pickedTarget, pointerDownClient, dragPlaneX, planePoint) {
		const linearElement = getLinearElement(app, pickedTarget.entityId);
		if (linearElement == null) {
			return null;
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

		return resetSceneManipulationState({
			mode,
			entityId: pickedTarget.entityId,
			pointerDownClient,
			dragPlaneX,
			dragOffset: {
				x: 0,
				y: planePoint.y - dragAnchor.y,
				z: planePoint.z - dragAnchor.z
			}
		});
	},
	update(app, entityId, state, planePoint) {
		const linearElement = getLinearElement(app, entityId);
		if (linearElement == null) {
			return false;
		}

		if (state.mode === 'move' && state.dragOffset != null) {
			const nextPosition = {
				x: linearElement.transform.position.x,
				y: planePoint.y - state.dragOffset.y,
				z: planePoint.z - state.dragOffset.z
			};
			if (sameVec3(linearElement.transform.position, nextPosition)) {
				return false;
			}

			app.updateComponent(entityId, app.c.AuthoredTransformMixin, {
				...linearElement.transform,
				position: nextPosition
			});
			markSceneManipulationEdit(app);
			return true;
		}

		if (state.mode !== 'resizeStart' && state.mode !== 'resizeEnd') {
			return false;
		}

		const draggedPoint = getDraggedHandlePoint(state.dragPlaneX!, planePoint, state.dragOffset);
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
			app.updateComponent(entityId, app.c.AuthoredTransformMixin, {
				...linearElement.transform,
				position: resized.position,
				rotation: resized.rotation
			});
			didChange = true;
		}
		if (linearElement.linear.length !== resized.length) {
			app.updateComponent(entityId, app.c.LinearElementMixin, {
				...linearElement.linear,
				length: resized.length
			});
			didChange = true;
		}

		if (!didChange) {
			return false;
		}

		markSceneManipulationEdit(app);
		return true;
	}
};

const notePlatformManipulationAdapter: TSceneManipulationAdapter = {
	getPlaneX(app, entityId) {
		return getNotePlatform(app, entityId)?.position.x ?? null;
	},
	begin(app, pickedTarget, pointerDownClient, dragPlaneX, planePoint) {
		if (pickedTarget.target !== 'handle-start' && pickedTarget.target !== 'handle-end') {
			return null;
		}

		const notePlatform = getNotePlatform(app, pickedTarget.entityId);
		if (notePlatform == null) {
			return null;
		}

		const handlePositions = getLinearElementHandlePositions(
			notePlatform.position,
			notePlatform.platform.rotationX,
			notePlatform.platform.length,
			NOTE_PLATFORM_HANDLE_OFFSET
		);
		const dragAnchor =
			pickedTarget.target === 'handle-start'
				? toVec3(handlePositions.start)
				: toVec3(handlePositions.end);

		return resetSceneManipulationState({
			mode: pickedTarget.target === 'handle-start' ? 'resizeStart' : 'resizeEnd',
			entityId: pickedTarget.entityId,
			pointerDownClient,
			dragPlaneX,
			dragOffset: {
				x: 0,
				y: planePoint.y - dragAnchor.y,
				z: planePoint.z - dragAnchor.z
			}
		});
	},
	update(app, entityId, state, planePoint) {
		if (state.mode !== 'resizeStart' && state.mode !== 'resizeEnd') {
			return false;
		}

		const notePlatform = getNotePlatform(app, entityId);
		if (notePlatform == null) {
			return false;
		}

		const draggedPoint = getDraggedHandlePoint(state.dragPlaneX!, planePoint, state.dragOffset);
		const resized = computeLinearResizeResult(
			{
				position: notePlatform.position,
				rotation: {
					x: notePlatform.platform.rotationX,
					y: 0,
					z: 0
				},
				minLength: NOTE_PLATFORM_LIMITS.length.min,
				maxLength: NOTE_PLATFORM_LIMITS.length.max,
				handleOffset: NOTE_PLATFORM_HANDLE_OFFSET
			},
			state.mode,
			draggedPoint
		);
		if (
			Math.abs(resized.rotation.x - notePlatform.platform.rotationX) < 1e-4 &&
			Math.abs(resized.length - notePlatform.platform.length) < 1e-4
		) {
			return false;
		}

		app.updateComponent(entityId, app.c.NotePlatformMixin, {
			...notePlatform.platform,
			rotationX: resized.rotation.x,
			length: resized.length
		});
		markSceneManipulationEdit(app);
		return true;
	}
};

export function beginSceneManipulation(
	app: TSceneApp,
	pickedTarget: TSceneManipulationPick,
	pointerDownClient: { x: number; y: number },
	planePoint: THREE.Vector3
): TSceneApp['r']['sceneManipulationState'] | null {
	const adapter = getSceneManipulationAdapter(app, pickedTarget.entityId);
	if (adapter == null) {
		return null;
	}

	const dragPlaneX = adapter.getPlaneX(app, pickedTarget.entityId);
	if (dragPlaneX == null) {
		return null;
	}

	return adapter.begin(app, pickedTarget, pointerDownClient, dragPlaneX, planePoint);
}

export function getSceneManipulationPlaneX(app: TSceneApp, entityId: number): number | null {
	return getSceneManipulationAdapter(app, entityId)?.getPlaneX(app, entityId) ?? null;
}

export function updateSceneManipulation(
	app: TSceneApp,
	entityId: number,
	state: TSceneApp['r']['sceneManipulationState'],
	planePoint: THREE.Vector3
): boolean {
	return (
		getSceneManipulationAdapter(app, entityId)?.update(app, entityId, state, planePoint) ?? false
	);
}

function getSceneManipulationAdapter(
	app: TSceneApp,
	entityId: number
): TSceneManipulationAdapter | null {
	if (app.hasComponent(entityId, app.c.LinearElementMixin)) {
		return linearElementManipulationAdapter;
	}
	if (app.hasComponent(entityId, app.c.NotePlatformMixin)) {
		return notePlatformManipulationAdapter;
	}
	return null;
}

function markSceneManipulationEdit(app: TSceneApp): void {
	app.setSceneEditPending(true);
	app.updateResource('sceneManipulationState', {
		...app.r.sceneManipulationState,
		didEdit: true
	});
}

function toVec3(vector: THREE.Vector3): { x: number; y: number; z: number } {
	return {
		x: vector.x,
		y: vector.y,
		z: vector.z
	};
}
