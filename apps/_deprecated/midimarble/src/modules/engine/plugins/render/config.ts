export const renderConfig = {
	camera: {
		forwardFallback: { x: 0, y: 0, z: 1 }
	},
	preview: {
		initial: {
			enabled: false,
			mode: 'followMarble',
			fov: 64,
			distance: 16,
			height: 2,
			lookAhead: 0,
			smoothing: 0.12
		},
		limits: {
			fov: { min: 20, max: 90, step: 1 },
			distance: { min: 3, max: 30, step: 0.1 },
			height: { min: -8, max: 8, step: 0.1 },
			lookAhead: { min: -8, max: 8, step: 0.1 },
			smoothing: { min: 0.02, max: 0.4, step: 0.01 }
		}
	}
} as const;
