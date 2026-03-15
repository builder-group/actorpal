export const midiConfig = {
	layout: {
		noteHeight: 16,
		keyboardWidth: 64,
		rulerHeight: 32,
		sidebarWidth: 140,
		totalNotes: 128,
		defaultScrollNote: 72,
		endPaddingBeats: 6
	},
	zoom: {
		defaultPixelsPerBeat: 80,
		minPixelsPerBeat: 20,
		maxPixelsPerBeat: 600,
		stepFactor: 1.25,
		wheelFactor: 1.15
	},
	colors: {
		trackPalette: [
			'#4f6ef7',
			'#22c55e',
			'#f59e0b',
			'#ef4444',
			'#8b5cf6',
			'#06b6d4',
			'#f97316',
			'#ec4899',
			'#84cc16',
			'#10b981'
		],
		pianoWhite: '#fbfcff',
		pianoWhiteC: '#f2f6ff',
		pianoBlack: 'linear-gradient(to right, #212121 0%, #605d5d 89.5%, #303030 92.4%, #000000 100%)',
		noteSelectedOpacity: 0.9,
		noteGhostOpacity: 0.15
	}
} as const;
