import * as THREE from 'three';
import type { TVec3 } from '../../types';
import { getLinearElementForward } from './lib/manipulation';

export interface TLinearResizeInput {
	position: TVec3;
	rotation: TVec3;
	minLength: number;
	maxLength: number;
	handleOffset: number;
}

export function getDraggedHandlePoint(
	planeX: number,
	planePoint: { y: number; z: number },
	dragOffset: TVec3 | null
): THREE.Vector3 {
	return new THREE.Vector3(
		planeX,
		planePoint.y - (dragOffset?.y ?? 0),
		planePoint.z - (dragOffset?.z ?? 0)
	);
}

export function computeLinearResizeResult(
	linearElement: TLinearResizeInput,
	mode: 'resizeStart' | 'resizeEnd',
	draggedPoint: THREE.Vector3
): { position: TVec3; rotation: TVec3; length: number } {
	const center = new THREE.Vector3(
		linearElement.position.x,
		linearElement.position.y,
		linearElement.position.z
	);
	const handleVector = draggedPoint.clone().sub(center);
	handleVector.x = 0;

	const handleDistance = handleVector.length();
	const desiredDirection =
		handleDistance < 1e-6
			? getLinearElementForward(linearElement.rotation.x)
			: handleVector.clone().normalize();
	if (mode === 'resizeStart') {
		desiredDirection.negate();
	}

	const clampedHandleDistance = THREE.MathUtils.clamp(
		handleDistance,
		linearElement.minLength * 0.5 + linearElement.handleOffset,
		linearElement.maxLength * 0.5 + linearElement.handleOffset
	);

	return {
		position: linearElement.position,
		rotation: {
			x: -Math.atan2(desiredDirection.y, desiredDirection.z),
			y: 0,
			z: 0
		},
		length: (clampedHandleDistance - linearElement.handleOffset) * 2
	};
}
