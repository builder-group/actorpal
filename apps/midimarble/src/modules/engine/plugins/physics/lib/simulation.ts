import type * as RAPIER from '@dimforge/rapier3d-compat';
import type {
	TCheckpointStore,
	TPhysicsApp,
	TRColliders,
	TRRigidBodies,
	TSimulationConfig,
	TSimulationTransport
} from '../types';

type TPhysicsSimulationRestoreAccess = {
	r: {
		rapier: TPhysicsApp['r']['rapier'];
		preloadWorld: TPhysicsApp['r']['preloadWorld'];
		preloadStep: number;
		fixedTimeStepSeconds: number;
		checkpointStore: TCheckpointStore;
		simulationTransport: TSimulationTransport;
		simulationConfig: TSimulationConfig;
	};
	updateResource: TPhysicsApp['updateResource'];
};

type TPhysicsWorldSwapAccess = {
	r: TPhysicsSimulationRestoreAccess['r'] & {
		world: TPhysicsApp['r']['world'];
		rigidBodies: TRRigidBodies;
		colliders: TRColliders;
	};
	updateResource: TPhysicsApp['updateResource'];
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
	app: TPhysicsSimulationRestoreAccess,
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

export function syncPreloadWorldToStep(
	app: TPhysicsSimulationRestoreAccess,
	targetStep: number
): void {
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
	world: NonNullable<TPhysicsWorldSwapAccess['r']['world']>
): void {
	refreshPhysicsHandles(app, world);
	const oldWorld = app.r.world;
	app.updateResource('world', world);
	oldWorld?.free();
}

function refreshPhysicsHandles(
	app: TPhysicsWorldSwapAccess,
	world: NonNullable<TPhysicsWorldSwapAccess['r']['world']>
): void {
	for (const [eid, body] of app.r.rigidBodies) {
		const restoredBody = world.getRigidBody(body.handle);
		if (restoredBody != null) {
			app.r.rigidBodies.set(eid, restoredBody);
		}
	}

	for (const [eid, colliders] of app.r.colliders) {
		app.r.colliders.set(
			eid,
			colliders
				.map((collider) => world.getCollider(collider.handle))
				.filter((collider): collider is NonNullable<typeof collider> => collider != null)
		);
	}
}
