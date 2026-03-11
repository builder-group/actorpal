import type { TBundle } from 'ecsify';
import type { TSceneApp } from '../types';

export type TSceneBundle = TBundle<
	TSceneApp['c'][
		| 'PositionMixin'
		| 'RotationMixin'
		| 'ScaleMixin'
		| 'MeshMixin'
		| 'RigidBodyMixin'
		| 'ColliderMixin'
		| 'StraightTrackMixin'
		| 'PegboardMixin'
		| 'MarbleMixin']
>;
