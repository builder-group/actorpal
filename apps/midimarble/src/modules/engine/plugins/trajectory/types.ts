import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TCorePlugin } from '../core';
import type { TPhysicsPlugin } from '../physics';
import type { TRenderPlugin } from '../render/types';
import type { TScenePlugin } from '../scene/types';

// MARK: - Plugin

export type TTrajectoryPlugin = TPlugin<
	{
		name: 'Trajectory';
		components: {
			TrajectoryLineMixin: [];
		};
		resources: {
			trajectoryConfig: TTrajectoryConfig;
			trajectoryState: TTrajectoryState;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TScenePlugin]
>;

export type TTrajectoryApp = TApp<
	TAppContext<
		[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TScenePlugin, TTrajectoryPlugin]
	>
>;

// MARK: - Resources

export interface TTrajectoryConfig {
	futureTicks: number;
	pastTicks: number;
	enabled: boolean;
	futureColor: string;
	pastColor: string;
}

export interface TTrajectoryState {
	initialized: boolean;
	/** Kept alongside entity IDs for efficient per-frame geometry updates */
	futureLine: THREE.Line | null;
	pastLine: THREE.Line | null;
	pastPositions: Array<{ x: number; y: number; z: number }>;
	futureBuffer: Float32Array;
	pastBuffer: Float32Array;
	prevFutureColor: string;
	prevPastColor: string;
}
