export const midiConfig = {
	layout: {
		noteHeight: 16,
		keyboardWidth: 72,
		rulerHeight: 32,
		sidebarWidth: 200,
		totalNotes: 128,
		defaultScrollNote: 60,
		minContentWidth: 1200,
		endPaddingBeats: 8
	},
	zoom: {
		defaultPixelsPerBeat: 72,
		minPixelsPerBeat: 24,
		maxPixelsPerBeat: 480,
		stepFactor: 1.2
	},
	colors: {
		trackPalette: [
			'#2563eb',
			'#f97316',
			'#eab308',
			'#16a34a',
			'#db2777',
			'#7c3aed',
			'#0891b2',
			'#dc2626',
			'#65a30d',
			'#4338ca'
		],
		pianoWhite: '#f6f3ea',
		pianoWhiteC: '#eef4ff',
		pianoBlack: 'linear-gradient(90deg, #212121 0%, #605d5d 89.5%, #303030 92.4%, #000000 100%)',
		noteSelectedOpacity: 0.9,
		noteGhostOpacity: 0.16
	}
} as const;
