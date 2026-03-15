import type { TSceneManipulationConfig } from './types';

export const MIDIMARBLE_SCENE_DEFAULTS = {
	straightTrackWallLaneX: -7.25,
	newStraightTrackYOffset: -3,
	newStraightTrackZOffset: 8,
	marbleSpawnPosition: { x: -7.25, y: 18.4, z: -25.2 },
	seedStraightTracks: [
		{
			position: { x: -7.25, y: 16, z: -18 },
			rotation: { x: 0.28, y: 0, z: 0 },
			length: 16
		},
		{
			position: { x: -7.25, y: 10.9, z: -1.4 },
			rotation: { x: -0.1, y: 0, z: 0 },
			length: 14
		},
		{
			position: { x: -7.25, y: 4.2, z: 12.8 },
			rotation: { x: 0.22, y: 0, z: 0 },
			length: 12
		}
	]
} as const;

export const SCENE_MANIPULATION_DEFAULTS: TSceneManipulationConfig = {
	handleRadius: 0.48,
	handleColor: '#facc15',
	dragStartPixels: 3
};
