import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import type { TTrajectoryApp } from './types';

const MAX_TICKS = 1000;

function buildLine(buffer: Float32Array, color: string): THREE.Line {
	const geometry = new THREE.BufferGeometry();
	const attr = new THREE.BufferAttribute(buffer, 3);
	attr.setUsage(THREE.DynamicDrawUsage);
	geometry.setAttribute('position', attr);
	geometry.setDrawRange(0, 0);
	return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
}

export function initTrajectoryLinesSystem(app: TTrajectoryApp) {
	const state = app.r.trajectoryState;
	if (state.initialized || !app.r.isReady) {
		return;
	}

	const config = app.r.trajectoryConfig;

	const futureBuffer = new Float32Array(MAX_TICKS * 3);
	const futureLine = buildLine(futureBuffer, config.futureColor);
	const futureEid = app.createEntity();
	app.addComponent(futureEid, app.c.MeshMixin, { type: 'three', object: futureLine });
	app.addComponent(futureEid, app.c.TrajectoryLineMixin);

	const pastBuffer = new Float32Array(MAX_TICKS * 3);
	const pastLine = buildLine(pastBuffer, config.pastColor);
	const pastEid = app.createEntity();
	app.addComponent(pastEid, app.c.MeshMixin, { type: 'three', object: pastLine });
	app.addComponent(pastEid, app.c.TrajectoryLineMixin);

	state.futureLine = futureLine;
	state.pastLine = pastLine;
	state.futureBuffer = futureBuffer;
	state.pastBuffer = pastBuffer;
	state.prevFutureColor = config.futureColor;
	state.prevPastColor = config.pastColor;
	state.initialized = true;
}

export function updateTrajectorySystem(app: TTrajectoryApp) {
	const state = app.r.trajectoryState;
	if (!state.initialized || !app.r.isReady) {
		return;
	}

	const config = app.r.trajectoryConfig;
	const { futureLine, pastLine } = state;
	if (futureLine == null || pastLine == null) {
		return;
	}

	futureLine.visible = config.enabled;
	pastLine.visible = config.enabled;

	if (!config.enabled) {
		return;
	}

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
