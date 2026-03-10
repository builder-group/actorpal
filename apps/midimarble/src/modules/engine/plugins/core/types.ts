import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TVec3 } from '../../types';

// MARK: - Plugin

export type TCorePlugin = TPlugin<
	{
		name: 'Core';
		components: {
			PositionMixin: TCPositionMixin[];
			RotationMixin: TCRotationMixin[];
			ScaleMixin: TCScaleMixin[];
		};
		resources: {
			elapsedSeconds: number;
		};
		appExtensions: {
			spawnSpatial(options: TSpawnSpatialOptions): number;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin]
>;

export type TCoreApp = TApp<TAppContext<[TDefaultPlugin, TCorePlugin]>>;

export interface TSpawnSpatialOptions {
	position?: TVec3;
	rotation?: TVec3;
	scale?: TVec3;
}

// MARK: - Components

export interface TCPositionMixin extends TVec3 {}
export interface TCRotationMixin extends TVec3 {}
export interface TCScaleMixin extends TVec3 {}
