import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import type { TTrajectoryApp } from './types';

const MAX_TICKS = 1000;

export function updateTrajectorySystem(app: TTrajectoryApp) {
	const config = app.r.trajectoryConfig;
	const { futureLine, pastLine } = app.r.trajectoryLines;

	futureLine.visible = config.enabled;
	pastLine.visible = config.enabled;

	if (!config.enabled || !app.r.isReady) {
		return;
	}

	const state = app.r.trajectoryLines;

	if (state.prevFutureColor !== config.futureColor) {
		(futureLine.material as THREE.LineBasicMaterial).color.set(config.futureColor);
		state.prevFutureColor = config.futureColor;
	}
	if (state.prevPastColor !== config.pastColor) {
		(pastLine.material as THREE.LineBasicMaterial).color.set(config.pastColor);
		state.prevPastColor = config.pastColor;
	}

	const marbles = [
		...app.queryComponents([Entity, app.c.PositionMixin] as const, With(app.c.MarbleMixin))
	];
	const firstMarble = marbles[0];
	if (firstMarble == null) {
		return;
	}
	const [marbleEid, marblePos] = firstMarble;

	state.pastPositions.push({ x: marblePos.x, y: marblePos.y, z: marblePos.z });
	if (state.pastPositions.length > config.pastTicks) {
		state.pastPositions.splice(0, state.pastPositions.length - config.pastTicks);
	}

	const pastCount = Math.min(state.pastPositions.length, MAX_TICKS);
	for (let i = 0; i < pastCount; i++) {
		const p = state.pastPositions[i]!;
		state.pastBuffer[i * 3] = p.x;
		state.pastBuffer[i * 3 + 1] = p.y;
		state.pastBuffer[i * 3 + 2] = p.z;
	}
	const pastAttr = pastLine.geometry.getAttribute('position') as THREE.BufferAttribute;
	pastAttr.needsUpdate = true;
	pastLine.geometry.setDrawRange(0, pastCount);

	const world = app.r.world;
	const rapier = app.r.rapier;
	if (world == null || rapier == null) {
		return;
	}

	const marbleBody = app.r.rigidBodies.get(marbleEid);
	if (marbleBody == null) {
		return;
	}

	const snapshot = world.takeSnapshot();
	const shadow = rapier.World.restoreSnapshot(snapshot);
	shadow.timestep = app.r.fixedTimeStepSeconds;

	const shadowBody = shadow.getRigidBody(marbleBody.handle);
	const futureTicks = Math.min(config.futureTicks, MAX_TICKS);

	for (let i = 0; i < futureTicks; i++) {
		shadow.step();
		const t = shadowBody.translation();
		state.futureBuffer[i * 3] = t.x;
		state.futureBuffer[i * 3 + 1] = t.y;
		state.futureBuffer[i * 3 + 2] = t.z;
	}

	shadow.free();

	const futureAttr = futureLine.geometry.getAttribute('position') as THREE.BufferAttribute;
	futureAttr.needsUpdate = true;
	futureLine.geometry.setDrawRange(0, futureTicks);
}
