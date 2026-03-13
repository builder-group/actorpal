import type { TBundle } from 'ecsify';
import type { TSceneApp } from '../types';

export type TSceneBundle = TBundle<
	TSceneApp['c'][
		| 'SceneElementMixin'
		| 'AuthoredTransformMixin'
		| 'PositionMixin'
		| 'RotationMixin'
		| 'ScaleMixin'
		| 'StraightTrackMixin'
		| 'LinearElementMixin'
		| 'PegboardMixin'
		| 'MarbleMixin'
		| 'TrajectorySourceTag'
		| 'MeshMixin'
		| 'RigidBodyMixin'
		| 'ColliderMixin']
>;
