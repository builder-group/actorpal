import type * as RAPIER from '@dimforge/rapier3d-compat';
import type { TCheckpointStore, TPhysicsApp, TPhysicsWorldHandles } from '../types';

type TPhysicsRestoreAccess = {
	r: Pick<
		TPhysicsApp['r'],
		| 'rapier'
		| 'preloadWorld'
		| 'preloadStep'
		| 'fixedTimeStepSeconds'
		| 'checkpointStore'
		| 'simulationConfig'
	>;
	updateResource: TPhysicsApp['updateResource'];
};

type TPhysicsWorldSwapAccess = TPhysicsRestoreAccess & {
	r: TPhysicsRestoreAccess['r'] & Pick<TPhysicsApp['r'], 'world' | 'rigidBodies' | 'colliders'>;
};

export function storeCheckpoint(
	checkpointStore: TCheckpointStore,
	step: number,
	snapshot: Uint8Array
): void {
	checkpointStore.set(step, snapshot);
}

export function findNearestCheckpointStep(
	checkpointStore: TCheckpointStore,
	targetStep: number
): number | null {
	let checkpointStep: number | null = null;
	for (const step of checkpointStore.keys()) {
		if (step <= targetStep && (checkpointStep == null || step > checkpointStep)) {
			checkpointStep = step;
		}
	}

	return checkpointStep;
}

export function restoreWorldAtStep(
	app: TPhysicsRestoreAccess,
	targetStep: number
): RAPIER.World | null {
	const rapier = app.r.rapier;
	if (rapier == null) {
		return null;
	}

	const checkpointStep = findNearestCheckpointStep(app.r.checkpointStore, targetStep);
	if (checkpointStep == null) {
		return null;
	}

	const snapshot = app.r.checkpointStore.get(checkpointStep);
	if (snapshot == null) {
		return null;
	}

	const restoredWorld = rapier.World.restoreSnapshot(snapshot);
	restoredWorld.timestep = app.r.fixedTimeStepSeconds;

	for (let step = checkpointStep; step < targetStep; step++) {
		restoredWorld.step();
	}

	return restoredWorld;
}

export function syncPreloadWorldToStep(app: TPhysicsRestoreAccess, targetStep: number): void {
	const rapier = app.r.rapier;
	if (rapier == null || !app.r.checkpointStore.has(0)) {
		return;
	}

	if (app.r.preloadWorld != null && app.r.preloadStep >= targetStep) {
		return;
	}

	const restoredWorld = restoreWorldAtStep(app, targetStep);
	if (restoredWorld == null) {
		return;
	}

	app.r.preloadWorld?.free();
	app.updateResource('preloadWorld', restoredWorld);
	app.updateResource('preloadStep', targetStep);
}

export function replaceLiveWorld(
	app: TPhysicsWorldSwapAccess,
	world: NonNullable<TPhysicsWorldSwapAccess['r']['world']>,
	fixedHandles: TPhysicsWorldHandles | null = null
): void {
	const nextHandles = createSwappedPhysicsHandles(app, world, fixedHandles);
	const oldWorld = app.r.world;
	app.updateResource('world', world);
	app.updateResource('rigidBodies', nextHandles.rigidBodies);
	app.updateResource('colliders', nextHandles.colliders);
	oldWorld?.free();
}

function createSwappedPhysicsHandles(
	app: TPhysicsWorldSwapAccess,
	world: NonNullable<TPhysicsWorldSwapAccess['r']['world']>,
	fixedHandles: TPhysicsWorldHandles | null
): TPhysicsWorldHandles {
	const nextRigidBodies: TPhysicsApp['r']['rigidBodies'] = new Map();
	const nextColliders: TPhysicsApp['r']['colliders'] = new Map();

	if (fixedHandles != null) {
		for (const [eid, body] of fixedHandles.rigidBodies) {
			nextRigidBodies.set(eid, body);
		}
		for (const [eid, colliders] of fixedHandles.colliders) {
			nextColliders.set(eid, colliders);
		}
	}

	for (const [eid, body] of app.r.rigidBodies) {
		if (fixedHandles?.rigidBodies.has(eid)) {
			continue;
		}

		const restoredBody = world.getRigidBody(body.handle);
		if (restoredBody != null) {
			nextRigidBodies.set(eid, restoredBody);
		}
	}

	for (const [eid, colliders] of app.r.colliders) {
		if (fixedHandles?.colliders.has(eid)) {
			continue;
		}

		const restoredColliders = colliders
			.map((collider) => world.getCollider(collider.handle))
			.filter((collider): collider is NonNullable<typeof collider> => collider != null);
		if (restoredColliders.length > 0) {
			nextColliders.set(eid, restoredColliders);
		}
	}

	return {
		rigidBodies: nextRigidBodies,
		colliders: nextColliders
	};
}
