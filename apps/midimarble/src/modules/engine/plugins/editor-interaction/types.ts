import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TVec3 } from '../../types';
import type { TCorePlugin } from '../core';
import type { TPhysicsPlugin } from '../physics';
import type { TRenderPlugin } from '../render';
import type { TScenePlugin } from '../scene';

export type TSceneEditorPlugin = TPlugin<
	{
		name: 'SceneEditor';
		resources: {
			editorSelection: TEditorSelection;
			trackEditState: TTrackEditState;
			trackEditConfig: TTrackEditConfig;
			trackEditHandles: TTrackEditHandles;
		};
		appExtensions: {
			disposeSceneEditor(): void;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TScenePlugin]
>;

export type TSceneEditorApp = TApp<
	TAppContext<
		[
			TDefaultPlugin,
			TCorePlugin,
			TPhysicsPlugin,
			TRenderPlugin,
			TScenePlugin,
			TSceneEditorPlugin
		]
	>
>;

export interface TEditorSelection {
	entityId: number | null;
	kind: 'straightTrack' | null;
}

export interface TTrackEditState {
	mode: 'idle' | 'move' | 'resizeStart' | 'resizeEnd';
	entityId: number | null;
	isDragging: boolean;
	dragRevisionPending: boolean;
	pointerDownClient: { x: number; y: number } | null;
	dragPlaneX: number | null;
	dragOffset: TVec3 | null;
	fixedEndpoint: TVec3 | null;
}

export interface TTrackEditConfig {
	minLength: number;
	maxLength: number;
	handleRadius: number;
	handleOffset: number;
	dragStartPixels: number;
}

export interface TTrackEditHandles {
	start: THREE.Mesh;
	end: THREE.Mesh;
}
