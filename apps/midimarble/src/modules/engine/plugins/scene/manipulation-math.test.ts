import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { computeLinearResizeResult, getDraggedHandlePoint } from './manipulation-math';

const baseLinearElement = {
	position: { x: -7.25, y: 16, z: -18 },
	rotation: { x: 0, y: 0, z: 0 },
	length: 14,
	minLength: 6,
	maxLength: 28,
	handleOffset: 0.8
};

describe('scene manipulation resize math', () => {
	it('keeps the authored length when the pointer starts on the current handle', () => {
		const draggedPoint = new THREE.Vector3(
			baseLinearElement.position.x,
			baseLinearElement.position.y,
			baseLinearElement.position.z + baseLinearElement.length * 0.5 + baseLinearElement.handleOffset
		);

		const resized = computeLinearResizeResult(baseLinearElement, 'resizeEnd', draggedPoint);

		expect(resized.length).toBeCloseTo(baseLinearElement.length, 5);
		expect(resized.rotation.x).toBeCloseTo(0, 5);
		expect(resized.position).toEqual(baseLinearElement.position);
	});

	it('extends the track continuously when the end handle moves away from center', () => {
		const draggedPoint = new THREE.Vector3(
			baseLinearElement.position.x,
			baseLinearElement.position.y,
			baseLinearElement.position.z + 10.8
		);

		const resized = computeLinearResizeResult(baseLinearElement, 'resizeEnd', draggedPoint);

		expect(resized.length).toBeCloseTo(20, 5);
		expect(resized.rotation.x).toBeCloseTo(0, 5);
	});

	it('preserves pointer-to-handle offset during drag reconstruction', () => {
		const draggedPoint = getDraggedHandlePoint(
			baseLinearElement.position.x,
			{ y: 12, z: -8 },
			{ x: 0, y: 2, z: -3 }
		);

		expect(draggedPoint).toEqual(new THREE.Vector3(baseLinearElement.position.x, 10, -5));
	});
});
