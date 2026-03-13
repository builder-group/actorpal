import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import { findNearestCheckpointStep } from '../physics/simulation';
import type { TTrajectoryApp } from './types';

const MAX_STEPS = 1000;

export function updateTrajectorySystem(app: TTrajectoryApp) {
	const config = app.r.trajectoryConfig;
	const { futureLine, pastLine } = app.r.trajectoryLines;

	futureLine.visible = config.enabled;
	pastLine.visible = config.enabled;

	if (!config.enabled || !app.r.isReady) {
		return;
	}

	const state = app.r.trajectoryLines;
	const shouldFreeze = app.r.simulationSync.mode !== 'idle';
	const nextSyncState = {
		world: app.r.world,
		playheadStep: app.r.simulationTransport.playheadStep,
		simulationSyncMode: app.r.simulationSync.mode,
		futureSteps: config.futureSteps,
		pastSteps: config.pastSteps,
		enabled: config.enabled
	};

	if (state.prevFutureColor !== config.futureColor) {
		(futureLine.material as THREE.LineBasicMaterial).color.set(config.futureColor);
		state.prevFutureColor = config.futureColor;
	}
	if (state.prevPastColor !== config.pastColor) {
		(pastLine.material as THREE.LineBasicMaterial).color.set(config.pastColor);
		state.prevPastColor = config.pastColor;
	}

	if (!shouldRefreshTrajectory(app.r.trajectorySyncState, nextSyncState)) {
		return;
	}

	app.updateResource('trajectorySyncState', nextSyncState);
	if (shouldFreeze) {
		return;
	}

	const firstSource = [
		...app.queryComponents([Entity, app.c.PositionMixin] as const, With(app.c.TrajectorySourceTag))
	][0];
	if (firstSource == null) {
		clearTrajectoryLines(app);
		return;
	}
	const [marbleEid] = firstSource;

	const world = app.r.world;
	const rapier = app.r.rapier;
	if (world == null || rapier == null) {
		return;
	}

	const marbleBody = app.r.rigidBodies.get(marbleEid);
	if (marbleBody == null) {
		clearTrajectoryLines(app);
		return;
	}

	const pastCount = rebuildPastTrajectory(app, marbleBody.handle);
	const pastAttr = pastLine.geometry.getAttribute('position') as THREE.BufferAttribute;
	pastAttr.needsUpdate = true;
	pastLine.geometry.setDrawRange(0, pastCount);

	const snapshot = world.takeSnapshot();
	const shadow = rapier.World.restoreSnapshot(snapshot);
	shadow.timestep = app.r.fixedTimeStepSeconds;

	const shadowBody = shadow.getRigidBody(marbleBody.handle);
	const futureSteps = Math.min(config.futureSteps, MAX_STEPS);

	for (let i = 0; i < futureSteps; i++) {
		shadow.step();
		const t = shadowBody.translation();
		state.futureBuffer[i * 3] = t.x;
		state.futureBuffer[i * 3 + 1] = t.y;
		state.futureBuffer[i * 3 + 2] = t.z;
	}

	shadow.free();

	const futureAttr = futureLine.geometry.getAttribute('position') as THREE.BufferAttribute;
	futureAttr.needsUpdate = true;
	futureLine.geometry.setDrawRange(0, futureSteps);
}

function clearTrajectoryLines(app: TTrajectoryApp): void {
	app.r.trajectoryLines.pastLine.geometry.setDrawRange(0, 0);
	app.r.trajectoryLines.futureLine.geometry.setDrawRange(0, 0);
}

function shouldRefreshTrajectory(
	prev: TTrajectoryApp['r']['trajectorySyncState'],
	next: TTrajectoryApp['r']['trajectorySyncState']
): boolean {
	return (
		prev.world !== next.world ||
		prev.playheadStep !== next.playheadStep ||
		prev.simulationSyncMode !== next.simulationSyncMode ||
		prev.futureSteps !== next.futureSteps ||
		prev.pastSteps !== next.pastSteps ||
		prev.enabled !== next.enabled
	);
}

function rebuildPastTrajectory(app: TTrajectoryApp, marbleHandle: number): number {
	const rapier = app.r.rapier;
	if (rapier == null) {
		return 0;
	}

	const configPastSteps = Math.min(app.r.trajectoryConfig.pastSteps, MAX_STEPS);
	const endStep = app.r.simulationTransport.playheadStep;
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
