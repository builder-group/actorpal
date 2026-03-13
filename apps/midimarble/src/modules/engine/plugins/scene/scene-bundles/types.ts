import type { TBundle } from 'ecsify';
import type { TSceneApp } from '../types';

export type TSceneBundle = TBundle<
	TSceneApp['c'][
		| 'SceneElementMixin'
		| 'AuthoredTransformMixin'
		| 'PositionMixin'
		| 'RotationMixin'
		| 'ScaleMixin'
		| 'MeshMixin'
		| 'RigidBodyMixin'
		| 'ColliderMixin'
		| 'StraightTrackMixin'
		| 'LinearElementMixin'
		| 'PegboardMixin'
		| 'MarbleMixin']
>;
