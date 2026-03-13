import type * as RAPIER from '@dimforge/rapier3d-compat';
import { Entity } from 'ecsify';
import { storeCheckpoint } from '../simulation';
import type { TCRigidBodyMixin, TPhysicsApp, TPhysicsColliderDescriptor } from '../types';
import { updateSimulationTransport } from './transport';

export function createRigidBodyDesc(
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

export function createColliderDesc(
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

export function createQuaternionFromEuler(x: number, y: number, z: number): RAPIER.Rotation {
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

export function quaternionToEuler(x: number, y: number, z: number, w: number) {
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

export function syncBodyTransform(
	body: RAPIER.RigidBody,
	kind: TCRigidBodyMixin['kind'],
	position: { x: number; y: number; z: number },
	rotation: { x: number; y: number; z: number }
): void {
	if (kind === 'kinematicPosition') {
		body.setNextKinematicTranslation(position);
		body.setNextKinematicRotation(createQuaternionFromEuler(rotation.x, rotation.y, rotation.z));
		return;
	}

	body.setTranslation(position, true);
	body.setRotation(createQuaternionFromEuler(rotation.x, rotation.y, rotation.z), true);
}

export function ensureSimulationBaseInitialized(app: TPhysicsApp): void {
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

export function createEditedWorldBase(app: TPhysicsApp): RAPIER.World | null {
	ensureSimulationBaseInitialized(app);

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
