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
		| 'StraightTrackGeometryMixin'
		| 'PegboardMixin'
		| 'MarbleMixin']
>;
