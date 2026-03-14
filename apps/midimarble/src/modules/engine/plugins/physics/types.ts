import type * as RAPIER from '@dimforge/rapier3d-compat';
import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TEngineSystemSet, TVec3 } from '../../types';
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
			preloadWorld: RAPIER.World | null;
			isReady: boolean;
			accumulatorSeconds: number;
			fixedTimeStepSeconds: number;
			simulationTransport: TSimulationTransport;
			simulationConfig: TSimulationConfig;
			checkpointStore: TCheckpointStore;
			preloadStep: number;
			rigidBodies: TRRigidBodies;
			colliders: TRColliders;
			simulationSync: TSimulationSync;
		};
		appExtensions: {
			markSimulationDirty(): void;
			requestSimulationSync(): void;
		};
		systemSets: TEngineSystemSet;
	},
	[TDefaultPlugin, TCorePlugin]
>;

export type TPhysicsApp = TApp<TAppContext<[TDefaultPlugin, TCorePlugin, TPhysicsPlugin]>>;

export type TRRigidBodies = Map<number, RAPIER.RigidBody>;
export type TRColliders = Map<number, RAPIER.Collider[]>;
export type TCheckpointStore = Map<number, Uint8Array>;

export interface TSimulationTransport {
	mode: 'paused' | 'running';
	playheadStep: number;
	bufferedStep: number;
}

export interface TSimulationConfig {
	checkpointIntervalSteps: number;
	preloadHorizonSteps: number;
	maxPreloadStepsPerUpdate: number;
	maxLiveStepsPerUpdate: number;
	maxSyncStepsPerUpdate: number;
	maxDeltaSeconds: number;
}

export type TSimulationSync =
	| TIdleSimulationSync
	| TDirtySimulationSync
	| TRebuildingSimulationSync;

export interface TIdleSimulationSync {
	mode: 'idle';
}

export interface TDirtySimulationSync {
	mode: 'dirty';
	resumeWhenReady: boolean;
	requested: boolean;
}

export interface TRebuildingSimulationSync {
	mode: 'rebuilding';
	targetStep: number;
	currentStep: number;
	resumeWhenReady: boolean;
	world: RAPIER.World;
	checkpointStore: TCheckpointStore;
}

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
