import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TCorePlugin } from '../core';
import type { Viewport } from './lib/Viewport';

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
		};
		appExtensions: {
			setRenderContainer(container: HTMLDivElement | null): void;
			disposeRender(): void;
		};
		systemSets: 'First' | 'PreUpdate' | 'Update' | 'PostUpdate' | 'Last' | 'Flush';
	},
	[TDefaultPlugin, TCorePlugin]
>;

export type TRenderApp = TApp<TAppContext<[TDefaultPlugin, TCorePlugin, TRenderPlugin]>>;

// MARK: - Resources

export type TRSceneObjects = Map<number, THREE.Object3D>;

// MARK: - Components

export type TCMeshMixin = TCThreeMeshMixin;

export interface TCThreeMeshMixin {
	type: 'three';
	object: THREE.Object3D;
}
