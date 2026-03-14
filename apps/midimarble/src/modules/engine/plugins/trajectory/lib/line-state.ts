import * as THREE from 'three';
import type { TTrajectoryApp } from '../types';

export const MAX_TRAJECTORY_STEPS = 1000;

export function buildTrajectoryLine(buffer: Float32Array, color: string): THREE.Line {
	const geometry = new THREE.BufferGeometry();
	const attr = new THREE.BufferAttribute(buffer, 3);
	attr.setUsage(THREE.DynamicDrawUsage);
	geometry.setAttribute('position', attr);
	geometry.setDrawRange(0, 0);
	return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
}

export function clearTrajectoryLines(app: TTrajectoryApp): void {
	app.r.trajectoryLines.pastLine.geometry.setDrawRange(0, 0);
	app.r.trajectoryLines.futureLine.geometry.setDrawRange(0, 0);
}

export function syncTrajectoryLineColors(app: TTrajectoryApp): void {
	const config = app.r.trajectoryConfig;
	const state = app.r.trajectoryLines;
	(state.futureLine.material as THREE.LineBasicMaterial).color.set(config.futureColor);
	(state.pastLine.material as THREE.LineBasicMaterial).color.set(config.pastColor);
}
