import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TEngineSystemSet, TVec3 } from '../../types';
import type { TCorePlugin } from '../core';
import type { TPhysicsPlugin } from '../physics';
import type { TCameraSnapshot, Viewport } from './lib/Viewport';

// MARK: - Plugin

export type TRenderPlugin = TPlugin<
	{
		name: 'Render';
		components: {
			MeshMixin: TCMeshMixin[];
		};
		resources: {
			viewport: Viewport;
			sceneObjects: TRSceneObjects;
			previewConfig: TPreviewConfig;
			previewState: TPreviewState;
		};
		appExtensions: {
			setRenderContainer(container: HTMLDivElement | null): void;
			setPreviewEnabled(enabled: boolean): void;
			togglePreview(): void;
			updatePreviewConfig(patch: Partial<TPreviewConfig>): void;
			setPreviewTargetEntity(entityId: number | null): void;
			disposeRender(): void;
		};
		systemSets: TEngineSystemSet;
	},
	[TDefaultPlugin, TCorePlugin, TPhysicsPlugin]
>;

export type TRenderApp = TApp<
	TAppContext<[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin]>
>;

// MARK: - Resources

export type TRSceneObjects = Map<number, THREE.Object3D>;

export interface TPreviewConfig {
	enabled: boolean;
	mode: 'followMarble';
	fov: number;
	distance: number;
	height: number;
	lookAhead: number;
	smoothing: number;
}

export interface TPreviewState {
	savedCameraSnapshot: TCameraSnapshot | null;
	lastFollowDirection: TVec3 | null;
	targetEntityId: number | null;
}

// MARK: - Components

export type TCMeshMixin = TCThreeMeshMixin;

export interface TCThreeMeshMixin {
	type: 'three';
	object: THREE.Object3D;
}
