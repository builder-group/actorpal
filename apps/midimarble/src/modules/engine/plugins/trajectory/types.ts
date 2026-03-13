import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TCorePlugin } from '../core';
import type { TPhysicsPlugin } from '../physics';
import type { TRenderPlugin } from '../render/types';

// MARK: - Plugin

export type TTrajectoryPlugin = TPlugin<
	{
		name: 'Trajectory';
		components: {
			TrajectorySourceTag: TCTrajectorySourceTag[];
		};
		resources: {
			trajectoryConfig: TTrajectoryConfig;
			trajectoryLines: TTrajectoryLines;
			trajectorySyncState: TTrajectorySyncState;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin]
>;

export type TTrajectoryApp = TApp<
	TAppContext<[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TTrajectoryPlugin]>
>;

// MARK: - Resources

export interface TTrajectoryConfig {
	futureSteps: number;
	pastSteps: number;
	enabled: boolean;
	futureColor: string;
	pastColor: string;
}

export interface TTrajectoryLines {
	/** Kept alongside entity IDs for efficient per-frame geometry updates */
	futureLine: THREE.Line;
	pastLine: THREE.Line;
	futureBuffer: Float32Array;
	pastBuffer: Float32Array;
	prevFutureColor: string;
	prevPastColor: string;
}

export interface TTrajectorySyncState {
	world: object | null;
	playheadStep: number;
	simulationSyncMode: 'idle' | 'dirty' | 'rebuilding';
	futureSteps: number;
	pastSteps: number;
	enabled: boolean;
}

// MARK: - Components

export interface TCTrajectorySourceTag {}
