import * as THREE from 'three';
import type { TTrajectoryApp } from '../types';

const INITIAL_POINT_CAPACITY = 2;

export function buildTrajectoryLine(color: string): THREE.Line {
	const geometry = new THREE.BufferGeometry();
	const positions = new Float32Array(INITIAL_POINT_CAPACITY * 3);
	const attr = new THREE.BufferAttribute(positions, 3);
	attr.setUsage(THREE.DynamicDrawUsage);
	geometry.setAttribute('position', attr);
	geometry.setDrawRange(0, 0);
	return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
}

export function syncTrajectoryLineColors(app: TTrajectoryApp): void {
	const config = app.r.trajectoryConfig;
	const state = app.r.trajectoryState;
	(state.futureLine.material as THREE.LineBasicMaterial).color.set(config.futureColor);
	(state.pastLine.material as THREE.LineBasicMaterial).color.set(config.pastColor);
}

export function setTrajectoryLinePoints(
	line: THREE.Line,
	points: Float32Array,
	pointCount: number
): void {
	const positions = ensureLineCapacity(line, pointCount);
	positions.set(points.subarray(0, pointCount * 3));
	const attribute = line.geometry.getAttribute('position') as THREE.BufferAttribute;
	attribute.needsUpdate = true;
	line.geometry.setDrawRange(0, pointCount);
}

export function clearTrajectoryVisuals(app: TTrajectoryApp): void {
	const state = app.r.trajectoryState;
	state.pastLine.geometry.setDrawRange(0, 0);
	state.futureLine.geometry.setDrawRange(0, 0);
	clearNoteMarkers(state.noteMarkerGroup, state.noteIdToMarker, state.markerToNoteId);
}

export function clearNoteMarkers(
	group: THREE.Group,
	noteIdToMarker: Map<number, THREE.Object3D>,
	markerToNoteId: Map<THREE.Object3D, number>
): void {
	for (const marker of noteIdToMarker.values()) {
		group.remove(marker);
	}

	noteIdToMarker.clear();
	markerToNoteId.clear();
}

function ensureLineCapacity(line: THREE.Line, pointCount: number): Float32Array {
	const attribute = line.geometry.getAttribute('position') as THREE.BufferAttribute;
	const current = attribute.array as Float32Array;
	if (current.length >= pointCount * 3) {
		return current;
	}

	const nextCapacity = Math.max(
		pointCount,
		Math.ceil(current.length / 3) * 2,
		INITIAL_POINT_CAPACITY
	);
	const next = new Float32Array(nextCapacity * 3);
	next.set(current);
	const nextAttribute = new THREE.BufferAttribute(next, 3);
	nextAttribute.setUsage(THREE.DynamicDrawUsage);
	line.geometry.setAttribute('position', nextAttribute);
	return next;
}
