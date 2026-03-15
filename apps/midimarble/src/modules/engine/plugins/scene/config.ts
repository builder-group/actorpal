import type { TSceneManipulationConfig } from './types';

export const sceneConfig = {
	marble: {
		defaultRadius: 0.36,
		physics: {
			defaults: { bounce: 0.32 },
			limits: { bounce: { min: 0, max: 0.9 } }
		}
	},
	notePlatform: {
		defaultColor: '#2a5e92',
		handleOffset: 0.22,
		limits: {
			offsetY: { min: -4, max: 4 },
			offsetZ: { min: -6, max: 6 },
			rotationX: { min: -1.2, max: 1.2 },
			length: { min: 0.8, max: 1.8 },
			bounce: { min: 0, max: 0.9 }
		}
	},
	track: {
		defaultWidth: 1.5,
		defaultHeight: 0.7,
		defaultChannelWidth: 1.3,
		defaultChannelDepth: 0.2
	}
} as const;

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
