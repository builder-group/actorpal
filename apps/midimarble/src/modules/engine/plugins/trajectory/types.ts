import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TEngineSystemSet, TVec3 } from '../../types';
import type { TAudioPlugin } from '../audio';
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
			trajectoryProjection: TTrajectoryProjection;
		};
		appExtensions: {
			disposeTrajectory(): void;
			syncNoteMarkers(noteState: TTrajectoryNoteMarkerState): void;
			updateTrajectoryConfig(patch: Partial<TTrajectoryConfig>): void;
		};
		systemSets: TEngineSystemSet;
	},
	[
		TDefaultPlugin,
		TCorePlugin,
		TMidiPlugin,
		TTransportPlugin,
		TAudioPlugin,
		TPhysicsPlugin,
		TRenderPlugin
	]
>;

export type TTrajectoryApp = TApp<
	TAppContext<
		[
			TDefaultPlugin,
			TCorePlugin,
			TMidiPlugin,
			TTransportPlugin,
			TAudioPlugin,
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
	pastPlacedMarkerMaterial: THREE.MeshBasicMaterial;
	pastAdjustedMarkerMaterial: THREE.MeshBasicMaterial;
	futureMarkerMaterial: THREE.MeshBasicMaterial;
	futurePlacedMarkerMaterial: THREE.MeshBasicMaterial;
	futureAdjustedMarkerMaterial: THREE.MeshBasicMaterial;
	selectedMarkerMaterial: THREE.MeshBasicMaterial;
}

export interface TTrajectoryProjection {
	noteAnchorsById: Map<number, TTrajectoryNoteAnchor>;
}

export interface TTrajectoryNoteAnchor {
	tick: number;
	step: number;
	position: TVec3;
	phase: 'past' | 'future';
}

export interface TTrajectoryNoteMarkerState {
	placedNoteIds: Set<number>;
	adjustedNoteIds: Set<number>;
}

// MARK: - Components

export interface TCTrajectorySourceTag {}
