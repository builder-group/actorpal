import type { TBundle } from '../../core';
import type { TSceneApp } from '../types';

export type TSceneBundle = TBundle<
	TSceneApp,
	| 'PositionMixin'
	| 'RotationMixin'
	| 'ScaleMixin'
	| 'MeshMixin'
	| 'RigidBodyMixin'
	| 'ColliderMixin'
	| 'StraightTrackMixin'
	| 'PegboardMixin'
	| 'MarbleMixin'
>;
