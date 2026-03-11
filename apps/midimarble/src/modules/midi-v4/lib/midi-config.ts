// Central configuration for the MIDI piano roll.
// All layout constants, zoom limits, and visual tokens live here.

export const midiConfig = {
	layout: {
		/** px per semitone row */
		noteHeight: 16,
		/** px for the sticky piano keyboard column */
		keyboardWidth: 64,
		/** px for the time ruler bar */
		rulerHeight: 32,
		/** px for the track panel sidebar */
		sidebarWidth: 140,
		/** MIDI notes span 0–127 */
		totalNotes: 128,
		/** Note to center vertically on load (72 = C5) */
		defaultScrollNote: 72,
		/** Extra beats of scrollable space after the last note */
		endPaddingBeats: 6
	},
	zoom: {
		/** Default pixels per beat */
		defaultPpb: 80,
		minPpb: 20,
		maxPpb: 600,
		/** Toolbar +/− step multiplier */
		stepFactor: 1.25,
		/** Ctrl+Wheel step multiplier */
		wheelFactor: 1.15
	},
	colors: {
		/** Track color palette (cycles by track index) */
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
		/** Physical piano key colors — actual white-key feel, not UI theme grays */
		pianoWhite: '#f2f2f2',
		pianoWhiteC: '#edf2ff',
		/** CSS gradient string for black keys */
		pianoBlack: 'linear-gradient(to right, #1a1a1a 0%, #484444 90%, #1a1a1a 100%)',
		noteSelectedOpacity: 0.9,
		noteGhostOpacity: 0.15
	}
} as const;
