import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TEngineSystemSet } from '../../types';
import type { TCorePlugin } from '../core';
import type { TMidiPlugin } from '../midi';
import type { TPhysicsPlugin } from '../physics';
import type { TRenderPlugin } from '../render/types';
import type { TTransportPlugin } from '../transport';

// MARK: - Plugin

export type TTrajectoryPlugin = TPlugin<
		{
			name: 'Trajectory';
			components: {
				TrajectorySourceTag: TCTrajectorySourceTag[];
			};
			resources: {
				trajectoryConfig: TTrajectoryConfig;
				trajectoryState: TTrajectoryState;
			};
			appExtensions: {
				disposeTrajectory(): void;
			};
			systemSets: TEngineSystemSet;
		},
	[TDefaultPlugin, TCorePlugin, TMidiPlugin, TTransportPlugin, TPhysicsPlugin, TRenderPlugin]
>;

export type TTrajectoryApp = TApp<
	TAppContext<
		[
			TDefaultPlugin,
			TCorePlugin,
			TMidiPlugin,
			TTransportPlugin,
			TPhysicsPlugin,
			TRenderPlugin,
			TTrajectoryPlugin
		]
	>
>;

// MARK: - Resources

export interface TTrajectoryConfig {
	enabled: boolean;
	futureColor: string;
	pastColor: string;
}

export interface TTrajectoryState {
	futureLine: THREE.Line;
	pastLine: THREE.Line;
	noteMarkerGroup: THREE.Group;
	noteIdToMarker: Map<number, THREE.Object3D>;
	markerToNoteId: Map<THREE.Object3D, number>;
	markerGeometry: THREE.SphereGeometry;
	pastMarkerMaterial: THREE.MeshBasicMaterial;
	futureMarkerMaterial: THREE.MeshBasicMaterial;
	selectedMarkerMaterial: THREE.MeshBasicMaterial;
}

// MARK: - Components

export interface TCTrajectorySourceTag {}
