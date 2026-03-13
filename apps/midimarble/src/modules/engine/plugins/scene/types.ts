import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TVec3 } from '../../types';
import type { TCorePlugin } from '../core/types';
import type { TPhysicsPlugin } from '../physics';
import type { TRenderPlugin } from '../render/types';

// MARK: - Plugin

export type TScenePlugin = TPlugin<
	{
		name: 'Scene';
		components: {
			SceneElementMixin: TCSceneElementMixin[];
			AuthoredTransformMixin: TCAuthoredTransformMixin[];
			MarbleMixin: TCMarbleMixin[];
			StraightTrackMixin: TCStraightTrackMixin[];
			LinearElementMixin: TCLinearElementMixin[];
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

export interface TCSceneElementMixin {
	kind: 'marble' | 'pegboard' | 'straightTrack';
	label: string;
	editable: boolean;
}

export interface TCAuthoredTransformMixin {
	position: TVec3;
	rotation: TVec3;
	scale: TVec3;
}

export interface TCMarbleMixin {
	radius: number;
}

export interface TCStraightTrackMixin {
	height: number;
	width: number;
	channelWidth: number;
	channelDepth: number;
	color: string;
}

export interface TCLinearElementMixin {
	length: number;
	minLength: number;
	maxLength: number;
	handleOffset: number;
}

export interface TCPegboardMixin {
	width: number;
	height: number;
	repeatWorldSize: number;
}

export type TStraightTrackGeometrySignatures = Map<number, string>;
