import type * as RAPIER from '@dimforge/rapier3d-compat';
import type { TVec3 } from '../../../types';
import { tickToStep, type TMidiSong } from '../../midi';
import { findNearestCheckpointStep } from '../../physics';
import type { TTrajectoryApp } from '../types';

export interface TTrajectorySamples {
	pastPoints: Float32Array;
	pastCount: number;
	futurePoints: Float32Array;
	futureCount: number;
	positionsByStep: Map<number, TVec3>;
}

export function rebuildTrajectorySamples(
	app: TTrajectoryApp,
	marbleHandle: number
): TTrajectorySamples | null {
	const rapier = app.r.rapier;
	const world = app.r.world;
	if (rapier == null || world == null) {
		return null;
	}

	const positionsByStep = new Map<number, TVec3>();
	const past = rebuildPastSamples(app, rapier, marbleHandle, positionsByStep);
	if (past == null) {
		return null;
	}

	const future = rebuildFutureSamples(app, rapier, world, marbleHandle, positionsByStep);
	if (future == null) {
		return null;
	}

	return {
		pastPoints: past.points,
		pastCount: past.count,
		futurePoints: future.points,
		futureCount: future.count,
		positionsByStep
	};
}

function rebuildPastSamples(
	app: TTrajectoryApp,
	rapier: typeof RAPIER,
	marbleHandle: number,
	positionsByStep: Map<number, TVec3>
): { points: Float32Array; count: number } | null {
	const endStep = Math.max(0, app.r.liveStep);
	const checkpointStep = findNearestCheckpointStep(app.r.checkpointStore, 0);
	if (checkpointStep == null) {
		return null;
	}

	const snapshot = app.r.checkpointStore.get(checkpointStep);
	if (snapshot == null) {
		return null;
	}

	const shadow = rapier.World.restoreSnapshot(snapshot);
	shadow.timestep = app.r.fixedTimeStepSeconds;

	try {
		const shadowBody = shadow.getRigidBody(marbleHandle);
		if (shadowBody == null) {
			return null;
		}

		const count = Math.max(1, endStep - checkpointStep + 1);
		const points = new Float32Array(count * 3);
		let pointIndex = 0;

		for (let step = checkpointStep; step < endStep; step++) {
			writePoint(points, pointIndex, shadowBody.translation());
			positionsByStep.set(step, toVec3(shadowBody.translation()));
			pointIndex++;
			shadow.step();
		}

		writePoint(points, pointIndex, shadowBody.translation());
		positionsByStep.set(endStep, toVec3(shadowBody.translation()));

		return {
			points,
			count: pointIndex + 1
		};
	} finally {
		shadow.free();
	}
}

function rebuildFutureSamples(
	app: TTrajectoryApp,
	rapier: typeof RAPIER,
	world: RAPIER.World,
	marbleHandle: number,
	positionsByStep: Map<number, TVec3>
): { points: Float32Array; count: number } | null {
	const liveStep = Math.max(0, app.r.liveStep);
	const bufferedStep = Math.max(
		liveStep,
		getTrajectoryBufferedStep(app.r.midiSong, app.r.bufferedStep, app.r.fixedTimeStepSeconds)
	);
	if (bufferedStep <= liveStep) {
		return {
			points: new Float32Array(0),
			count: 0
		};
	}

	const shadow = rapier.World.restoreSnapshot(world.takeSnapshot());
	shadow.timestep = app.r.fixedTimeStepSeconds;

	try {
		const shadowBody = shadow.getRigidBody(marbleHandle);
		if (shadowBody == null) {
			return null;
		}

		const count = bufferedStep - liveStep + 1;
		const points = new Float32Array(count * 3);
		let pointIndex = 0;

		writePoint(points, pointIndex, shadowBody.translation());
		pointIndex++;

		for (let step = liveStep + 1; step <= bufferedStep; step++) {
			shadow.step();
			writePoint(points, pointIndex, shadowBody.translation());
			positionsByStep.set(step, toVec3(shadowBody.translation()));
			pointIndex++;
		}

		return {
			points,
			count
		};
	} finally {
		shadow.free();
	}
}

export function getTrajectoryBufferedStep(
	song: Pick<TMidiSong, 'totalTicks' | 'bpm' | 'ticksPerBeat'> | null,
	bufferedStep: number,
	fixedTimeStepSeconds: number
): number {
	if (song == null) {
		return Math.max(0, bufferedStep);
	}

	return Math.max(
		0,
		Math.min(bufferedStep, tickToStep(song.totalTicks, song, fixedTimeStepSeconds))
	);
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

function toVec3(point: { x: number; y: number; z: number }): TVec3 {
	return {
		x: point.x,
		y: point.y,
		z: point.z
	};
}
