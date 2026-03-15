export const physicsConfig = {
	timeStepSeconds: 1 / 240,
	gravity: { x: 0, y: -9.81, z: 0 },
	simulation: {
		checkpointIntervalSteps: 60,
		preloadHorizonSteps: 2400,
		maxPreloadStepsPerUpdate: 120,
		maxLiveStepsPerUpdate: 12,
		maxSyncStepsPerUpdate: 240
	}
} as const;
