import type * as RAPIER from '@dimforge/rapier3d-compat';
import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TVec3 } from '../../types';
import type { TCorePlugin } from '../core';

export type TPhysicsPlugin = TPlugin<
	{
		name: 'Physics';
		components: {
			RigidBodyMixin: TCRigidBodyMixin[];
			ColliderMixin: TCColliderMixin[];
		};
		resources: {
			rapier: typeof RAPIER | null;
			world: RAPIER.World | null;
			isReady: boolean;
			accumulatorSeconds: number;
			fixedTimeStepSeconds: number;
			rigidBodies: TRRigidBodies;
			colliders: TRColliders;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin]
>;

export type TPhysicsApp = TApp<TAppContext<[TDefaultPlugin, TCorePlugin, TPhysicsPlugin]>>;

export type TRRigidBodies = Map<number, RAPIER.RigidBody>;
export type TRColliders = Map<number, RAPIER.Collider[]>;

export interface TCRigidBodyMixin {
	kind: 'dynamic' | 'fixed' | 'kinematicPosition';
	gravityScale?: number;
	canSleep?: boolean;
	linearDamping?: number;
	angularDamping?: number;
	linearVelocity?: TVec3;
	angularVelocity?: TVec3;
}

export interface TCColliderMixin {
	descriptors: TPhysicsColliderDescriptor[];
}

interface TBaseColliderDescriptor {
	translation?: TVec3;
	rotation?: TVec3;
	friction?: number;
	restitution?: number;
	density?: number;
	sensor?: boolean;
}

export interface TBallColliderDescriptor extends TBaseColliderDescriptor {
	shape: 'ball';
	radius: number;
}

export interface TCuboidColliderDescriptor extends TBaseColliderDescriptor {
	shape: 'cuboid';
	halfExtents: TVec3;
}

export type TPhysicsColliderDescriptor = TBallColliderDescriptor | TCuboidColliderDescriptor;
