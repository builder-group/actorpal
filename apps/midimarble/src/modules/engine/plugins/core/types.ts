import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TVec3 } from '../../types';
import { TBundle } from './bundle';

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
			insertBundle(eid: number, bundle: TBundle): void;
			spawnBundle(bundle: TBundle): number;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin]
>;

export type TCoreApp = TApp<TAppContext<[TDefaultPlugin, TCorePlugin]>>;

// MARK: - Components

export interface TCPositionMixin extends TVec3 {}
export interface TCRotationMixin extends TVec3 {}
export interface TCScaleMixin extends TVec3 {}
