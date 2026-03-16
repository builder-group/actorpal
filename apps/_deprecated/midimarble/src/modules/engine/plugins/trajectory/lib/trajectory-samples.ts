import type * as RAPIER from '@dimforge/rapier3d-compat';
import type { TVec3 } from '../../../types';
import { tickToStep, type TMidiSong } from '../../midi';
import { restoreWorldAtStep } from '../../physics/lib/simulation';
import type { TTrajectoryApp } from '../types';

export interface TTrajectorySampleCache {
	points: Float32Array;
	endStep: number;
}

export function rebuildTrajectorySampleCache(
	app: TTrajectoryApp,
	marbleHandle: number
): TTrajectorySampleCache | null {
	const targetBufferedStep = getTrajectoryBufferedStep(
		app.r.midiSong,
		app.r.bufferedStep,
		app.r.fixedTimeStepSeconds
	);
	if (targetBufferedStep < 0) {
		return {
			points: new Float32Array(0),
			endStep: -1
		};
	}

	return sampleTrajectorySteps(app, marbleHandle, 0, targetBufferedStep);
}

export function extendTrajectorySampleCache(
	app: TTrajectoryApp,
	marbleHandle: number,
	cache: TTrajectorySampleCache
): TTrajectorySampleCache | null {
	const targetBufferedStep = getTrajectoryBufferedStep(
		app.r.midiSong,
		app.r.bufferedStep,
		app.r.fixedTimeStepSeconds
	);
	if (targetBufferedStep <= cache.endStep) {
		return cache;
	}
	if (cache.endStep < 0) {
		return rebuildTrajectorySampleCache(app, marbleHandle);
	}

	const appended = sampleTrajectorySteps(app, marbleHandle, cache.endStep, targetBufferedStep);
	if (appended == null) {
		return null;
	}

	const nextPoints = new Float32Array((targetBufferedStep + 1) * 3);
	nextPoints.set(cache.points);
	nextPoints.set(appended.points.subarray(3), cache.points.length);

	return {
		points: nextPoints,
		endStep: targetBufferedStep
	};
}

export function getTrajectorySamplePosition(
	cache: TTrajectorySampleCache,
	step: number
): TVec3 | null {
	if (step < 0 || step > cache.endStep) {
		return null;
	}

	return {
		x: cache.points[step * 3] ?? 0,
		y: cache.points[step * 3 + 1] ?? 0,
		z: cache.points[step * 3 + 2] ?? 0
	};
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

function sampleTrajectorySteps(
	app: TTrajectoryApp,
	marbleHandle: number,
	startStep: number,
	endStep: number
): TTrajectorySampleCache | null {
	const world = restoreWorldAtStep(app, startStep);
	if (world == null) {
		return null;
	}

	try {
		return sampleTrajectoryStepsFromWorld(world, marbleHandle, startStep, endStep);
	} finally {
		world.free();
	}
}

function sampleTrajectoryStepsFromWorld(
	world: RAPIER.World,
	marbleHandle: number,
	startStep: number,
	endStep: number
): TTrajectorySampleCache | null {
	const body = world.getRigidBody(marbleHandle);
	if (body == null) {
		return null;
	}

	const count = Math.max(1, endStep - startStep + 1);
	const points = new Float32Array(count * 3);

	for (let step = startStep; step <= endStep; step += 1) {
		writePoint(points, step - startStep, body.translation());
		if (step < endStep) {
			world.step();
		}
	}

	return {
		points,
		endStep
	};
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
