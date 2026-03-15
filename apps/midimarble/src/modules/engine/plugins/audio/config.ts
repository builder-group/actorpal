export const audioConfig = {
	defaultInstrumentId: 'bell',
	instrumentOptions: [
		{ id: 'classic', label: 'Classic' },
		{ id: 'bell', label: 'Bell' },
		{ id: 'xylophone', label: 'Xylophone' },
		{ id: 'warm', label: 'Warm' },
		{ id: 'pluck', label: 'Pluck' },
		{ id: 'lead', label: 'Lead' }
	],
	playback: {
		maxNoteSeconds: 2.5,
		previewMaxNoteSeconds: 0.9,
		voiceCleanupPaddingSeconds: 1.6
	}
} as const;
