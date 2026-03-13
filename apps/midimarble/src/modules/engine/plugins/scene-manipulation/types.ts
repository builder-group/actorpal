import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TVec3 } from '../../types';
import type { TCorePlugin } from '../core';
import type { TPhysicsPlugin } from '../physics';
import type { TRenderPlugin } from '../render';
import type { TScenePlugin } from '../scene';

export type TSceneManipulationPlugin = TPlugin<
	{
		name: 'SceneManipulation';
		resources: {
			sceneSelection: TSceneSelection;
			sceneManipulationState: TSceneManipulationState;
			sceneManipulationConfig: TSceneManipulationConfig;
			sceneManipulationHandles: TSceneManipulationHandles;
			sceneManipulationHandleSignature: string;
		};
		appExtensions: {
			disposeSceneManipulation(): void;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TScenePlugin]
>;

export type TSceneManipulationApp = TApp<
	TAppContext<
		[
			TDefaultPlugin,
			TCorePlugin,
			TPhysicsPlugin,
			TRenderPlugin,
			TScenePlugin,
			TSceneManipulationPlugin
		]
	>
>;

export interface TSceneSelection {
	entityId: number | null;
}

export interface TSceneManipulationState {
	mode: 'idle' | 'move' | 'resizeStart' | 'resizeEnd';
	entityId: number | null;
	isDragging: boolean;
	dragRevisionCommitted: boolean;
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
