import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TCorePlugin } from '../core/types';
import type { TPhysicsPlugin } from '../physics';
import type { TRenderPlugin } from '../render/types';

// MARK: - Plugin

export type TScenePlugin = TPlugin<
	{
		name: 'Scene';
		components: {
			MarbleMixin: TCMarbleMixin[];
			StraightTrackMixin: TCStraightTrackMixin[];
			StraightTrackGeometryMixin: TCStraightTrackGeometryMixin[];
			PegboardMixin: TCPegboardMixin[];
		};
		resources: {
			straightTrackGeometrySignatures: TStraightTrackGeometrySignatures;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin]
>;

export type TSceneApp = TApp<
	TAppContext<[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TScenePlugin]>
>;

// MARK: - Components

export interface TCMarbleMixin {
	radius: number;
}

export type TCStraightTrackMixin = [];

export interface TCStraightTrackGeometryMixin {
	length: number;
	height: number;
	width: number;
	channelWidth: number;
	channelDepth: number;
	color: string;
}

export type TCPegboardMixin = [];

export type TStraightTrackGeometrySignatures = Map<number, string>;
