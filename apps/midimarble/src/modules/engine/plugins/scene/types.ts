import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TVec3 } from '../../types';
import type { TCorePlugin } from '../core/types';
import type { TPhysicsPlugin } from '../physics/types';
import type { TRenderPlugin } from '../render/types';
import type { TTrajectoryPlugin } from '../trajectory/types';

// MARK: - Plugin

export type TScenePlugin = TPlugin<
	{
		name: 'Scene';
		components: {
			SceneElementMixin: TCSceneElementMixin[];
			AuthoredTransformMixin: TCAuthoredTransformMixin[];
			MarbleMixin: TCMarbleMixin[];
			StraightTrackMixin: TCStraightTrackMixin[];
			LinearElementMixin: TCLinearElementMixin[];
			PegboardMixin: TCPegboardMixin[];
		};
		resources: {
			sceneSelection: TSceneSelection;
			sceneManipulationState: TSceneManipulationState;
			sceneManipulationConfig: TSceneManipulationConfig;
			sceneManipulationHandles: TSceneManipulationHandles;
		};
		appExtensions: {
			disposeScene(): void;
		};
		systemSets: 'First' | 'PreUpdate' | 'Update' | 'PostUpdate' | 'Last' | 'Flush';
	},
	[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TTrajectoryPlugin]
>;

export type TSceneApp = TApp<
	TAppContext<
		[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TTrajectoryPlugin, TScenePlugin]
	>
>;

// MARK: - Components

export interface TCSceneElementMixin {
	kind: 'marble' | 'pegboard' | 'straightTrack';
	label: string;
	editable: boolean;
}

export interface TCAuthoredTransformMixin {
	position: TVec3;
	rotation: TVec3;
	scale: TVec3;
}

export interface TCMarbleMixin {
	radius: number;
}

export interface TCStraightTrackMixin {
	height: number;
	width: number;
	channelWidth: number;
	channelDepth: number;
	color: string;
}

export interface TCLinearElementMixin {
	length: number;
	minLength: number;
	maxLength: number;
	handleOffset: number;
}

export interface TCPegboardMixin {
	width: number;
	height: number;
	repeatWorldSize: number;
}

export interface TSceneSelection {
	entityId: number | null;
}

export interface TSceneManipulationState {
	mode: 'idle' | 'move' | 'resizeStart' | 'resizeEnd';
	entityId: number | null;
	isDragging: boolean;
	pointerDownClient: { x: number; y: number } | null;
	dragPlaneX: number | null;
	dragOffset: TVec3 | null;
}

export interface TSceneManipulationConfig {
	handleRadius: number;
	handleColor: string;
	dragStartPixels: number;
}

export interface TSceneManipulationHandles {
	start: THREE.Mesh;
	end: THREE.Mesh;
}
