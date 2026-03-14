import type { TApp, TAppContext, TBundle, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TEngineSystemSet, TVec3 } from '../../types';

// MARK: - Plugin

export type TCorePlugin = TPlugin<
	{
		name: 'Core';
		components: {
			PositionMixin: TCPositionMixin[];
			RotationMixin: TCRotationMixin[];
			ScaleMixin: TCScaleMixin[];
		};
		appExtensions: {
			spawnBundle(bundle: TBundle): number;
		};
		systemSets: TEngineSystemSet;
	},
	[TDefaultPlugin]
>;

export type TCoreApp = TApp<TAppContext<[TDefaultPlugin, TCorePlugin]>>;

// MARK: - Components

export interface TCPositionMixin extends TVec3 {}
export interface TCRotationMixin extends TVec3 {}
export interface TCScaleMixin extends TVec3 {}
