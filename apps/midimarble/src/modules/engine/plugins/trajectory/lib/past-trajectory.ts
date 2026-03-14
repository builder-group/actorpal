import { findNearestCheckpointStep } from '../../physics';
import type { TTrajectoryApp } from '../types';
import { MAX_TRAJECTORY_STEPS } from './line-state';

export function rebuildPastTrajectory(app: TTrajectoryApp, marbleHandle: number): number {
	const rapier = app.r.rapier;
	if (rapier == null) {
		return 0;
	}

	const configPastSteps = Math.min(app.r.trajectoryConfig.pastSteps, MAX_TRAJECTORY_STEPS);
	const endStep = app.r.liveStep;
	const startStep = Math.max(0, endStep - Math.max(configPastSteps - 1, 0));
	const checkpointStep = findNearestCheckpointStep(app.r.checkpointStore, startStep);
	if (checkpointStep == null) {
		return 0;
	}

	const snapshot = app.r.checkpointStore.get(checkpointStep);
	if (snapshot == null) {
		return 0;
	}

	const shadow = rapier.World.restoreSnapshot(snapshot);
	shadow.timestep = app.r.fixedTimeStepSeconds;

	try {
		const shadowBody = shadow.getRigidBody(marbleHandle);
		if (shadowBody == null) {
			return 0;
		}

		let count = 0;
		for (let step = checkpointStep; step < endStep; step++) {
			if (step >= startStep) {
				writePoint(app.r.trajectoryLines.pastBuffer, count, shadowBody.translation());
				count++;
			}
			shadow.step();
		}

		writePoint(app.r.trajectoryLines.pastBuffer, count, shadowBody.translation());
		return count + 1;
	} finally {
		shadow.free();
	}
}

function writePoint(
	buffer: Float32Array,
	index: number,
	point: { x: number; y: number; z: number }
): void {
	buffer[index * 3] = point.x;
	buffer[index * 3 + 1] = point.y;
	buffer[index * 3 + 2] = point.z;
}
