export const trajectoryConfig = {
	defaults: {
		enabled: true,
		futureColor: '#4a90e2',
		pastColor: '#ff9943'
	},
	marker: {
		scale: 0.22,
		selectedScale: 0.3,
		colors: {
			past: '#ffb05b',
			pastPlaced: '#34d399',
			pastAdjusted: '#f59e0b',
			future: '#68aef2',
			futurePlaced: '#6ee7b7',
			futureAdjusted: '#facc15',
			selected: '#f43f5e'
		}
	}
} as const;
