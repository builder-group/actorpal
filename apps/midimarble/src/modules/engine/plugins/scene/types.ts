import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TVec3 } from '../../types';
import type { TCorePlugin } from '../core/types';
import type { TRenderPlugin } from '../render/types';

// MARK: - Plugin

export type TScenePlugin = TPlugin<
	{
		name: 'Scene';
		components: {
			FallingMarbleMixin: TCFallingMarbleMixin[];
		};
		appExtensions: {
			spawnPegboard(): number;
			spawnDemoMarble(options: TSpawnDemoMarbleOptions): number;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin, TRenderPlugin]
>;

export type TSceneApp = TApp<
	TAppContext<[TDefaultPlugin, TCorePlugin, TRenderPlugin, TScenePlugin]>
>;

export interface TSpawnDemoMarbleOptions {
	x: number;
	z: number;
	startY: number;
	speed: number;
	resetY: number;
	spin: TVec3;
}

// MARK: - Components

export interface TCFallingMarbleMixin {
	speed: number;
	startY: number;
	resetY: number;
	spinX: number;
	spinY: number;
	spinZ: number;
}
