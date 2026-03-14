import { Entity, With } from 'ecsify';
import { updateTransport } from '../transport';
import {
	replaceLiveWorld,
	restoreWorldAtStep,
	storeCheckpoint,
	syncPreloadWorldToStep
} from './lib/simulation';
import { startSimulationSync } from './lib/simulation-sync';
import { getTransportTargetStep } from './lib/transport-step';
import {
	createColliderDesc,
	createQuaternionFromEuler,
	createRigidBodyDesc,
	ensureSimulationBaseInitialized,
	quaternionToEuler,
	syncBodyTransform
} from './lib/world';
import type { TPhysicsApp } from './types';

export function spawnRigidBodiesSystem(app: TPhysicsApp) {
	const world = app.r.world;
	const rapier = app.r.rapier;
	if (world == null || rapier == null) {
		return;
	}

	for (const [eid, position, rotation, rigidBody, collider] of app.queryComponents([
		Entity,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.RigidBodyMixin,
		app.c.ColliderMixin
	] as const)) {
		if (app.r.rigidBodies.has(eid)) {
			continue;
		}

		const bodyDesc = createRigidBodyDesc(rapier, rigidBody);
		bodyDesc.setTranslation(position.x, position.y, position.z);
		bodyDesc.setRotation(createQuaternionFromEuler(rotation.x, rotation.y, rotation.z));

		const body = world.createRigidBody(bodyDesc);
		const colliders = collider.descriptors.map((descriptor) =>
			world.createCollider(createColliderDesc(rapier, descriptor), body)
		);

		app.r.rigidBodies.set(eid, body);
		app.r.colliders.set(eid, colliders);
	}
}

export function syncNonDynamicBodiesFromComponentsSystem(app: TPhysicsApp) {
	for (const [eid, position, rotation, rigidBody] of app.queryComponents([
		Entity,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.RigidBodyMixin
	] as const)) {
		if (rigidBody.kind === 'dynamic') {
			continue;
		}
		if (rigidBody.kind === 'fixed' && app.r.simulationSync.mode !== 'idle') {
			continue;
		}

		const body = app.r.rigidBodies.get(eid);
		if (body == null) {
			continue;
		}

		syncBodyTransform(body, rigidBody.kind, position, rotation);
	}
}

export function beginSimulationSyncSystem(app: TPhysicsApp) {
	startSimulationSync(app);
}

export function syncLiveWorldToTransportSystem(app: TPhysicsApp) {
	if (app.r.world == null || app.r.simulationSync.mode !== 'idle') {
		return;
	}

	ensureSimulationBaseInitialized(app);

	const targetStep = getTransportTargetStep(app);
	if (targetStep === app.r.liveStep) {
		return;
	}
	if (targetStep > app.r.liveStep && app.r.transport.mode === 'running') {
		return;
	}

	const restoredWorld = restoreWorldAtStep(app, targetStep);
	if (restoredWorld == null) {
		return;
	}

	replaceLiveWorld(app, restoredWorld);
	const nextBufferedStep = Math.max(app.r.bufferedStep, targetStep);
	app.updateResource('liveStep', targetStep);
	app.updateResource('bufferedStep', nextBufferedStep);
	syncPreloadWorldToStep(app, nextBufferedStep);
}

export function stepPhysicsWorldSystem(app: TPhysicsApp) {
	const world = app.r.world;
	if (world == null || app.r.simulationSync.mode !== 'idle') {
		return;
	}

	ensureSimulationBaseInitialized(app);

	if (app.r.transport.mode !== 'running') {
		return;
	}

	const config = app.r.simulationConfig;
	const targetStep = getTransportTargetStep(app);
	let liveStep = app.r.liveStep;
	let bufferedStep = app.r.bufferedStep;
	let stepsRun = 0;

	while (liveStep < targetStep && stepsRun < config.maxLiveStepsPerUpdate) {
		world.step();
		liveStep++;
		stepsRun++;

		if (liveStep % config.checkpointIntervalSteps === 0) {
			storeCheckpoint(app.r.checkpointStore, liveStep, world.takeSnapshot());
		}
	}

	if (stepsRun === 0) {
		return;
	}

	bufferedStep = Math.max(bufferedStep, liveStep);
	app.updateResource('liveStep', liveStep);
	app.updateResource('bufferedStep', bufferedStep);
}

export function advanceSimulationSyncSystem(app: TPhysicsApp) {
	const simulationSync = app.r.simulationSync;
	if (simulationSync.mode !== 'rebuilding') {
		return;
	}

	const config = app.r.simulationConfig;
	let currentStep = simulationSync.currentStep;
	let stepsRun = 0;

	while (currentStep < simulationSync.targetStep && stepsRun < config.maxSyncStepsPerUpdate) {
		simulationSync.world.step();
		currentStep++;
		stepsRun++;

		if (currentStep % config.checkpointIntervalSteps === 0) {
			storeCheckpoint(
				simulationSync.checkpointStore,
				currentStep,
				simulationSync.world.takeSnapshot()
			);
		}
	}

	if (currentStep !== simulationSync.currentStep) {
		app.updateResource('simulationSync', {
			...simulationSync,
			currentStep
		});
		app.updateResource('bufferedStep', currentStep);
	}

	if (currentStep < simulationSync.targetStep) {
		return;
	}

	if (!simulationSync.checkpointStore.has(currentStep)) {
		storeCheckpoint(
			simulationSync.checkpointStore,
			currentStep,
			simulationSync.world.takeSnapshot()
		);
	}

	app.r.checkpointStore.clear();
	for (const [step, snapshot] of simulationSync.checkpointStore) {
		storeCheckpoint(app.r.checkpointStore, step, snapshot);
	}

	replaceLiveWorld(app, simulationSync.world, simulationSync.fixedHandles);

	app.r.preloadWorld?.free();
	const rapier = app.r.rapier;
	if (rapier != null) {
		const preloadWorld = rapier.World.restoreSnapshot(simulationSync.world.takeSnapshot());
		preloadWorld.timestep = app.r.fixedTimeStepSeconds;
		app.updateResource('preloadWorld', preloadWorld);
	}
	app.updateResource('preloadStep', currentStep);
	app.updateResource('simulationSync', { mode: 'idle' });
	app.updateResource('liveStep', currentStep);
	app.updateResource('bufferedStep', currentStep);
	updateTransport(app, {
		mode: simulationSync.resumeWhenReady ? 'running' : 'paused'
	});
}

export function preloadPhysicsWorldSystem(app: TPhysicsApp) {
	const rapier = app.r.rapier;
	const world = app.r.world;
	if (rapier == null || world == null || app.r.simulationSync.mode !== 'idle') {
		return;
	}

	ensureSimulationBaseInitialized(app);
	syncPreloadWorldToStep(app, app.r.bufferedStep);

	const preloadWorld = app.r.preloadWorld;
	if (preloadWorld == null) {
		return;
	}

	const { simulationConfig } = app.r;
	const targetBufferedStep = getTransportTargetStep(app) + simulationConfig.preloadHorizonSteps;
	if (app.r.bufferedStep >= targetBufferedStep) {
		return;
	}

	let preloadStep = app.r.preloadStep;
	let bufferedStep = app.r.bufferedStep;
	let stepsRun = 0;

	while (
		bufferedStep < targetBufferedStep &&
		stepsRun < simulationConfig.maxPreloadStepsPerUpdate
	) {
		preloadWorld.step();
		preloadStep++;
		bufferedStep = preloadStep;
		stepsRun++;

		if (preloadStep % simulationConfig.checkpointIntervalSteps === 0) {
			storeCheckpoint(app.r.checkpointStore, preloadStep, preloadWorld.takeSnapshot());
		}
	}

	if (stepsRun === 0) {
		return;
	}

	app.updateResource('preloadStep', preloadStep);
	app.updateResource('bufferedStep', bufferedStep);
}

export function syncDynamicBodiesToComponentsSystem(app: TPhysicsApp) {
	for (const [eid, rigidBody] of app.queryComponents(
		[Entity, app.c.RigidBodyMixin] as const,
		With(app.c.RigidBodyMixin)
	)) {
		const body = app.r.rigidBodies.get(eid);
		if (body == null || rigidBody.kind !== 'dynamic') {
			continue;
		}

		const translation = body.translation();
		const rotation = body.rotation();
		const euler = quaternionToEuler(rotation.x, rotation.y, rotation.z, rotation.w);

		app.updateComponent(eid, app.c.PositionMixin, {
			x: translation.x,
			y: translation.y,
			z: translation.z
		});
		app.updateComponent(eid, app.c.RotationMixin, euler);
	}
}

export function cleanupOrphanedPhysicsBodiesSystem(app: TPhysicsApp) {
	const activeEntities = new Set(app.queryEntities(With(app.c.RigidBodyMixin)));
	const world = app.r.world;

	for (const [eid, colliders] of app.r.colliders) {
		if (activeEntities.has(eid)) {
			continue;
		}

		if (world != null) {
			for (const collider of colliders) {
				world.removeCollider(collider, true);
			}
		}

		app.r.colliders.delete(eid);
	}

	for (const [eid, body] of app.r.rigidBodies) {
		if (activeEntities.has(eid)) {
			continue;
		}

		world?.removeRigidBody(body);
		app.r.rigidBodies.delete(eid);
	}
}
