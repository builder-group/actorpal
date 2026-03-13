import type * as RAPIER from '@dimforge/rapier3d-compat';
import { Entity, With } from 'ecsify';
import { startSimulationSync } from './lib/simulation-sync';
import { updateSimulationTransport } from './lib/transport';
import {
	createColliderDesc,
	createQuaternionFromEuler,
	createRigidBodyDesc,
	ensureSimulationBaseInitialized,
	quaternionToEuler,
	syncBodyTransform
} from './lib/world';
import { replaceLiveWorld, storeCheckpoint, syncPreloadWorldToStep } from './simulation';
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

export function stepPhysicsWorldSystem(app: TPhysicsApp, dt = 0) {
	const world = app.r.world;
	if (world == null || app.r.simulationSync.mode !== 'idle') {
		return;
	}

	ensureSimulationBaseInitialized(app);

	const config = app.r.simulationConfig;
	const transport = app.r.simulationTransport;
	if (transport.mode !== 'running') {
		return;
	}

	app.r.accumulatorSeconds += Math.min(Math.max(dt, 0), config.maxDeltaSeconds);

	let playheadStep = transport.playheadStep;
	let bufferedStep = transport.bufferedStep;
	let stepsRun = 0;

	while (
		app.r.accumulatorSeconds >= app.r.fixedTimeStepSeconds &&
		stepsRun < config.maxLiveStepsPerUpdate
	) {
		world.step();
		app.r.accumulatorSeconds -= app.r.fixedTimeStepSeconds;
		playheadStep++;
		stepsRun++;

		if (playheadStep % config.checkpointIntervalSteps === 0) {
			storeCheckpoint(app.r.checkpointStore, playheadStep, world.takeSnapshot());
		}
	}

	if (stepsRun === 0) {
		return;
	}

	bufferedStep = Math.max(bufferedStep, playheadStep);
	updateSimulationTransport(app, {
		playheadStep,
		bufferedStep
	});
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
		updateSimulationTransport(app, {
			bufferedStep: currentStep
		});
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

	app.r.accumulatorSeconds = 0;
	replaceLiveWorld(app, simulationSync.world);

	app.r.preloadWorld?.free();
	const rapier = app.r.rapier;
	if (rapier != null) {
		const preloadWorld = rapier.World.restoreSnapshot(simulationSync.world.takeSnapshot());
		preloadWorld.timestep = app.r.fixedTimeStepSeconds;
		app.updateResource('preloadWorld', preloadWorld);
	}
	app.updateResource('preloadStep', currentStep);
	app.updateResource('simulationSync', { mode: 'idle' });
	updateSimulationTransport(app, {
		mode: simulationSync.resumeWhenReady ? 'running' : 'paused',
		playheadStep: currentStep,
		bufferedStep: currentStep
	});
}

export function preloadPhysicsWorldSystem(app: TPhysicsApp) {
	const rapier = app.r.rapier;
	const world = app.r.world;
	if (rapier == null || world == null || app.r.simulationSync.mode !== 'idle') {
		return;
	}

	ensureSimulationBaseInitialized(app);
	syncPreloadWorldToStep(app, app.r.simulationTransport.bufferedStep);

	const preloadWorld = app.r.preloadWorld;
	if (preloadWorld == null) {
		return;
	}

	const { simulationConfig, simulationTransport } = app.r;
	const targetBufferedStep =
		simulationTransport.playheadStep + simulationConfig.preloadHorizonSteps;
	if (simulationTransport.bufferedStep >= targetBufferedStep) {
		return;
	}

	let preloadStep = app.r.preloadStep;
	let bufferedStep = simulationTransport.bufferedStep;
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
	updateSimulationTransport(app, { bufferedStep });
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
