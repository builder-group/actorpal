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
			pendingSceneEditInvalidation: TPendingSceneEditInvalidation;
			sceneEditRebuild: TSceneEditRebuild;
		};
		appExtensions: {
			notifyAuthoredSceneMutation(options?: { preserveRevision?: boolean }): void;
			endAuthoredSceneMutation(): void;
		};
		systemSets: 'First' | 'Update' | 'Last';
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
	revision: number;
}

export interface TSimulationConfig {
	checkpointIntervalSteps: number;
	preloadHorizonSteps: number;
	maxPreloadStepsPerUpdate: number;
	maxLiveStepsPerUpdate: number;
	maxEditRebuildStepsPerUpdate: number;
	maxDeltaSeconds: number;
}

export interface TPendingSceneEditInvalidation {
	dirty: boolean;
	revisionBumped: boolean;
}

export interface TSceneEditRebuild {
	active: boolean;
	targetStep: number;
	currentStep: number;
	revision: number;
	resumeWhenReady: boolean;
	world: RAPIER.World | null;
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
