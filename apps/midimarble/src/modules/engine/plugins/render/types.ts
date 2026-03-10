import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TCorePlugin, TSpawnSpatialOptions } from '../core';
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
			meshObjects: TRMeshObjects;
		};
		appExtensions: {
			spawnRenderable(options: TSpawnRenderableOptions): number;
			setRenderContainer(container: HTMLDivElement | null): void;
			disposeRender(): void;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin]
>;

export type TRenderApp = TApp<TAppContext<[TDefaultPlugin, TCorePlugin, TRenderPlugin]>>;

export interface TSpawnRenderableOptions extends TSpawnSpatialOptions {
	meshRef: string;
}

// MARK: - Resources

export type TRMeshObjects = Map<number, THREE.Object3D | null>;

// MARK: - Components

export interface TCMeshMixin {
	ref: string;
}
