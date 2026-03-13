import * as THREE from 'three';
import type { TTrajectoryApp } from '../types';

export function clearTrajectoryLines(app: TTrajectoryApp): void {
	app.r.trajectoryLines.pastLine.geometry.setDrawRange(0, 0);
	app.r.trajectoryLines.futureLine.geometry.setDrawRange(0, 0);
}

export function syncTrajectoryLineColors(app: TTrajectoryApp): void {
	const config = app.r.trajectoryConfig;
	const state = app.r.trajectoryLines;

	if (state.prevFutureColor !== config.futureColor) {
		(state.futureLine.material as THREE.LineBasicMaterial).color.set(config.futureColor);
		state.prevFutureColor = config.futureColor;
	}

	if (state.prevPastColor !== config.pastColor) {
		(state.pastLine.material as THREE.LineBasicMaterial).color.set(config.pastColor);
		state.prevPastColor = config.pastColor;
	}
}
