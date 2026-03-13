import type * as RAPIER from '@dimforge/rapier3d-compat';
import { Entity, With } from 'ecsify';
import { storeCheckpoint, syncPreloadWorldToStep } from './simulation';
import type {
	TCRigidBodyMixin,
	TPhysicsApp,
	TPhysicsColliderDescriptor,
	TSimulationTransport
} from './types';

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

		const body = app.r.rigidBodies.get(eid);
		if (body == null) {
			continue;
		}

		if (rigidBody.kind === 'kinematicPosition') {
			body.setNextKinematicTranslation(position);
			body.setNextKinematicRotation(createQuaternionFromEuler(rotation.x, rotation.y, rotation.z));
			continue;
		}

		body.setTranslation(position, true);
		body.setRotation(createQuaternionFromEuler(rotation.x, rotation.y, rotation.z), true);
	}
}

export function stepPhysicsWorldSystem(app: TPhysicsApp, dt = 0) {
	const world = app.r.world;
	if (world == null || app.r.sceneEditRebuild.active) {
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

export function preloadPhysicsWorldSystem(app: TPhysicsApp) {
	const rapier = app.r.rapier;
	const world = app.r.world;
	if (rapier == null || world == null || app.r.sceneEditRebuild.active) {
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

export function invalidateSimulationOnSceneEditSystem(app: TPhysicsApp) {
	const rapier = app.r.rapier;
	const pending = app.r.pendingSceneEditInvalidation;
	if (rapier == null || !pending.dirty) {
		return;
	}

	const targetStep = app.r.simulationTransport.playheadStep;
	let nextRevision =
		pending.revisionBumped && app.r.sceneEditRebuild.active
			? app.r.sceneEditRebuild.revision
			: app.r.simulationTransport.revision;
	if (!pending.revisionBumped) {
		nextRevision += 1;
	}

	const rebuiltWorld = createEditedWorldBase(app);
	if (rebuiltWorld == null) {
		return;
	}

	app.r.accumulatorSeconds = 0;
	app.r.sceneEditRebuild.world?.free();
	app.r.preloadWorld?.free();
	app.updateResource('sceneEditRebuild', {
		active: true,
		targetStep,
		currentStep: 0,
		revision: nextRevision,
		resumeWhenReady: app.r.sceneEditRebuild.resumeWhenReady,
		world: rebuiltWorld,
		checkpointStore: new Map([[0, rebuiltWorld.takeSnapshot()]])
	});
	app.updateResource('pendingSceneEditInvalidation', {
		dirty: false,
		revisionBumped: true
	});
	app.updateResource('preloadWorld', null);
	app.updateResource('preloadStep', 0);
	updateSimulationTransport(app, {
		mode: 'paused',
		playheadStep: targetStep,
		bufferedStep: Math.min(app.r.simulationTransport.bufferedStep, targetStep)
	});
}

export function advanceSceneEditRebuildSystem(app: TPhysicsApp) {
	const rebuild = app.r.sceneEditRebuild;
	const rebuildWorld = rebuild.world;
	if (!rebuild.active || rebuildWorld == null) {
		return;
	}

	const config = app.r.simulationConfig;
	let currentStep = rebuild.currentStep;
	let stepsRun = 0;

	while (currentStep < rebuild.targetStep && stepsRun < config.maxEditRebuildStepsPerUpdate) {
		rebuildWorld.step();
		currentStep++;
		stepsRun++;

		if (currentStep % config.checkpointIntervalSteps === 0) {
			storeCheckpoint(rebuild.checkpointStore, currentStep, rebuildWorld.takeSnapshot());
		}
	}

	if (currentStep !== rebuild.currentStep) {
		app.updateResource('sceneEditRebuild', {
			...rebuild,
			currentStep
		});
	}

	if (currentStep < rebuild.targetStep) {
		return;
	}

	const completedWorld = rebuildWorld;
	const completedCheckpoints = rebuild.checkpointStore;

	app.r.checkpointStore.clear();
	for (const [step, snapshot] of completedCheckpoints) {
		storeCheckpoint(app.r.checkpointStore, step, snapshot);
	}
	if (!app.r.checkpointStore.has(currentStep)) {
		storeCheckpoint(app.r.checkpointStore, currentStep, completedWorld.takeSnapshot());
	}

	replaceEditedLiveWorld(app, completedWorld);
	app.r.preloadWorld?.free();
	const rapier = app.r.rapier;
	if (rapier != null) {
		const preloadSnapshot = completedWorld.takeSnapshot();
		const preloadWorld = rapier.World.restoreSnapshot(preloadSnapshot);
		preloadWorld.timestep = app.r.fixedTimeStepSeconds;
		app.updateResource('preloadWorld', preloadWorld);
	}
	app.updateResource('preloadStep', currentStep);
	app.updateResource('sceneEditRebuild', {
		active: false,
		targetStep: currentStep,
		currentStep,
		revision: rebuild.revision,
		resumeWhenReady: false,
		world: null,
		checkpointStore: new Map()
	});
	updateSimulationTransport(app, {
		mode: rebuild.resumeWhenReady ? 'running' : 'paused',
		playheadStep: currentStep,
		bufferedStep: currentStep,
		revision: rebuild.revision
	});
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

function createRigidBodyDesc(
	rapier: typeof RAPIER,
	rigidBody: TCRigidBodyMixin
): RAPIER.RigidBodyDesc {
	const desc =
		rigidBody.kind === 'dynamic'
			? rapier.RigidBodyDesc.dynamic()
			: rigidBody.kind === 'kinematicPosition'
				? rapier.RigidBodyDesc.kinematicPositionBased()
				: rapier.RigidBodyDesc.fixed();

	if (rigidBody.gravityScale != null) {
		desc.setGravityScale(rigidBody.gravityScale);
	}
	if (rigidBody.canSleep != null) {
		desc.setCanSleep(rigidBody.canSleep);
	}
	if (rigidBody.linearDamping != null) {
		desc.setLinearDamping(rigidBody.linearDamping);
	}
	if (rigidBody.angularDamping != null) {
		desc.setAngularDamping(rigidBody.angularDamping);
	}
	if (rigidBody.linearVelocity != null) {
		desc.setLinvel(
			rigidBody.linearVelocity.x,
			rigidBody.linearVelocity.y,
			rigidBody.linearVelocity.z
		);
	}
	if (rigidBody.angularVelocity != null) {
		desc.setAngvel(rigidBody.angularVelocity);
	}

	return desc;
}

function createColliderDesc(
	rapier: typeof RAPIER,
	descriptor: TPhysicsColliderDescriptor
): RAPIER.ColliderDesc {
	const collider =
		descriptor.shape === 'ball'
			? rapier.ColliderDesc.ball(descriptor.radius)
			: rapier.ColliderDesc.cuboid(
					descriptor.halfExtents.x,
					descriptor.halfExtents.y,
					descriptor.halfExtents.z
				);

	if (descriptor.translation != null) {
		collider.setTranslation(
			descriptor.translation.x,
			descriptor.translation.y,
			descriptor.translation.z
		);
	}
	if (descriptor.rotation != null) {
		collider.setRotation(
			createQuaternionFromEuler(descriptor.rotation.x, descriptor.rotation.y, descriptor.rotation.z)
		);
	}
	if (descriptor.friction != null) {
		collider.setFriction(descriptor.friction);
	}
	if (descriptor.restitution != null) {
		collider.setRestitution(descriptor.restitution);
	}
	if (descriptor.density != null) {
		collider.setDensity(descriptor.density);
	}
	if (descriptor.sensor != null) {
		collider.setSensor(descriptor.sensor);
	}

	return collider;
}

function createQuaternionFromEuler(x: number, y: number, z: number): RAPIER.Rotation {
	const cx = Math.cos(x * 0.5);
	const sx = Math.sin(x * 0.5);
	const cy = Math.cos(y * 0.5);
	const sy = Math.sin(y * 0.5);
	const cz = Math.cos(z * 0.5);
	const sz = Math.sin(z * 0.5);

	return {
		x: sx * cy * cz - cx * sy * sz,
		y: cx * sy * cz + sx * cy * sz,
		z: cx * cy * sz - sx * sy * cz,
		w: cx * cy * cz + sx * sy * sz
	};
}

function quaternionToEuler(x: number, y: number, z: number, w: number) {
	const sinrCosp = 2 * (w * x + y * z);
	const cosrCosp = 1 - 2 * (x * x + y * y);
	const roll = Math.atan2(sinrCosp, cosrCosp);

	const sinp = 2 * (w * y - z * x);
	const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp);

	const sinyCosp = 2 * (w * z + x * y);
	const cosyCosp = 1 - 2 * (y * y + z * z);
	const yaw = Math.atan2(sinyCosp, cosyCosp);

	return { x: roll, y: pitch, z: yaw };
}

function ensureSimulationBaseInitialized(app: TPhysicsApp): void {
	const world = app.r.world;
	const rapier = app.r.rapier;
	if (world == null || rapier == null || app.r.checkpointStore.has(0)) {
		return;
	}

	const initialSnapshot = world.takeSnapshot();
	storeCheckpoint(app.r.checkpointStore, 0, initialSnapshot);

	const preloadWorld = rapier.World.restoreSnapshot(initialSnapshot);
	preloadWorld.timestep = app.r.fixedTimeStepSeconds;

	app.updateResource('preloadWorld', preloadWorld);
	app.updateResource('preloadStep', 0);
	updateSimulationTransport(app, { playheadStep: 0, bufferedStep: 0 });
}

function updateSimulationTransport(app: TPhysicsApp, patch: Partial<TSimulationTransport>): void {
	app.updateResource('simulationTransport', {
		...app.r.simulationTransport,
		...patch
	});
}

function createEditedWorldBase(app: TPhysicsApp): RAPIER.World | null {
	const rapier = app.r.rapier;
	if (rapier == null) {
		return null;
	}

	const baseSnapshot = app.r.checkpointStore.get(0);
	if (baseSnapshot == null) {
		return null;
	}

	const rebuiltWorld = rapier.World.restoreSnapshot(baseSnapshot);
	rebuiltWorld.timestep = app.r.fixedTimeStepSeconds;
	reapplyAuthoredStaticScene(app, rebuiltWorld, rapier);
	return rebuiltWorld;
}

function reapplyAuthoredStaticScene(
	app: TPhysicsApp,
	world: RAPIER.World,
	rapier: typeof RAPIER
): void {
	for (const [eid, position, rotation, rigidBody, collider] of app.queryComponents([
		Entity,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.RigidBodyMixin,
		app.c.ColliderMixin
	] as const)) {
		if (rigidBody.kind !== 'fixed') {
			continue;
		}

		const currentBody = app.r.rigidBodies.get(eid);
		if (currentBody == null) {
			continue;
		}

		const rebuiltBody = world.getRigidBody(currentBody.handle);
		if (rebuiltBody == null) {
			continue;
		}

		rebuiltBody.setTranslation(position, true);
		rebuiltBody.setRotation(createQuaternionFromEuler(rotation.x, rotation.y, rotation.z), true);

		const existingColliderCount = rebuiltBody.numColliders();
		for (let index = existingColliderCount - 1; index >= 0; index--) {
			const existingCollider = rebuiltBody.collider(index);
			if (existingCollider != null) {
				world.removeCollider(existingCollider, true);
			}
		}

		for (const descriptor of collider.descriptors) {
			world.createCollider(createColliderDesc(rapier, descriptor), rebuiltBody);
		}
	}
}

function replaceEditedLiveWorld(
	app: TPhysicsApp,
	world: NonNullable<TPhysicsApp['r']['world']>
): void {
	const nextRigidBodies = new Map<number, RAPIER.RigidBody>();
	const nextColliders = new Map<number, RAPIER.Collider[]>();

	for (const [eid] of app.queryComponents(
		[Entity, app.c.RigidBodyMixin] as const,
		With(app.c.RigidBodyMixin)
	)) {
		const currentBody = app.r.rigidBodies.get(eid);
		if (currentBody == null) {
			continue;
		}

		const rebuiltBody = world.getRigidBody(currentBody.handle);
		if (rebuiltBody == null) {
			continue;
		}

		const colliders: RAPIER.Collider[] = [];
		for (let index = 0; index < rebuiltBody.numColliders(); index++) {
			const collider = rebuiltBody.collider(index);
			if (collider != null) {
				colliders.push(collider);
			}
		}

		nextRigidBodies.set(eid, rebuiltBody);
		nextColliders.set(eid, colliders);
	}

	app.r.rigidBodies.clear();
	for (const [eid, body] of nextRigidBodies) {
		app.r.rigidBodies.set(eid, body);
	}

	app.r.colliders.clear();
	for (const [eid, colliders] of nextColliders) {
		app.r.colliders.set(eid, colliders);
	}

	const oldWorld = app.r.world;
	app.updateResource('world', world);
	oldWorld?.free();
}
