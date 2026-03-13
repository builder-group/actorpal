import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import { clearTrajectoryLines, syncTrajectoryLineColors } from './lib/line-state';
import { getMaxTrajectorySteps, rebuildPastTrajectory } from './lib/past-trajectory';
import { shouldRefreshTrajectory } from './lib/refresh';
import type { TTrajectoryApp } from './types';

export function updateTrajectorySystem(app: TTrajectoryApp) {
	const config = app.r.trajectoryConfig;
	const { futureLine, pastLine } = app.r.trajectoryLines;

	futureLine.visible = config.enabled;
	pastLine.visible = config.enabled;

	if (!config.enabled || !app.r.isReady) {
		return;
	}

	const shouldFreeze = app.r.simulationSync.mode !== 'idle';
	const state = app.r.trajectoryLines;
	syncTrajectoryLineColors(app);

	if (!shouldRefreshTrajectory(app)) {
		return;
	}

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
	if (shadowBody == null) {
		shadow.free();
		clearTrajectoryLines(app);
		return;
	}

	const futureSteps = Math.min(config.futureSteps, getMaxTrajectorySteps());

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
