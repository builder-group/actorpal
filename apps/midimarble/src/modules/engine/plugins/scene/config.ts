export const sceneConfig = {
	marble: {
		defaultRadius: 0.36,
		spawn: {
			position: { x: -7.25, y: 20, z: 8 },
			rotation: { x: 0, y: 0, z: 0 }
		},
		physics: {
			defaults: { bounce: 0.32 },
			limits: { bounce: { min: 0, max: 0.9 } }
		}
	},
	notePlatform: {
		defaultColor: '#2a5e92',
		handleOffset: 0.22,
		defaults: {
			offsetY: 0,
			offsetZ: 0,
			rotationX: 0,
			length: 1.2,
			width: 1.5,
			thickness: 0.22,
			bounce: 0.58
		},
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
		defaultChannelDepth: 0.2,
		defaultLength: 14,
		minLength: 6,
		maxLength: 28,
		handleOffset: 0.8,
		colorPalette: ['#2a5e92', '#ffeead', '#ff9943', '#8ac6d6'] as const,
		wallLaneX: -7.25,
		newTrackYOffset: -3,
		newTrackZOffset: 5
	},
	manipulation: {
		handleRadius: 0.48,
		handleColor: '#facc15',
		dragStartPixels: 3
	}
} as const;
