import { audioConfig } from '../config';
import type { TAudioConfig, TAudioInstrumentId, TAudioInstrumentPlayer } from '../types';
import { AMSynth, FMSynth, MonoSynth, PolySynth, Synth } from './tone-runtime';

export function getTrackInstrumentId(
	trackInstrumentIds: TAudioConfig['trackInstrumentIds'],
	trackId: number | null | undefined
): TAudioInstrumentId | null {
	if (trackId == null) {
		return null;
	}

	return trackInstrumentIds[trackId] ?? audioConfig.defaultInstrumentId;
}

export function isAudioInstrumentId(value: string): value is TAudioInstrumentId {
	return audioConfig.instrumentOptions.some((option) => option.id === value);
}

export function createInstrumentPlayer(instrumentId: TAudioInstrumentId): TAudioInstrumentPlayer {
	switch (instrumentId) {
		case 'classic':
			return new PolySynth(Synth, {
				oscillator: { type: 'triangle' },
				envelope: { attack: 0.01, decay: 0.18, sustain: 0.35, release: 0.7 }
			});
		case 'bell':
			return new PolySynth(FMSynth, {
				harmonicity: 3.01,
				modulationIndex: 14,
				oscillator: { type: 'sine' },
				envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.4 },
				modulation: { type: 'square' },
				modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 1.2 }
			});
		case 'xylophone':
			return new PolySynth(FMSynth, {
				harmonicity: 2.4,
				modulationIndex: 10,
				oscillator: { type: 'triangle' },
				envelope: { attack: 0.001, decay: 0.42, sustain: 0, release: 0.22 },
				modulation: { type: 'square' },
				modulationEnvelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.12 }
			});
		case 'warm':
			return new PolySynth(AMSynth, {
				harmonicity: 1.5,
				oscillator: { type: 'sine' },
				envelope: { attack: 0.03, decay: 0.25, sustain: 0.45, release: 0.9 },
				modulation: { type: 'triangle' },
				modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.8 }
			});
		case 'pluck':
			return new PolySynth(Synth, {
				oscillator: { type: 'triangle8' },
				envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.14 }
			});
		case 'lead':
			return new PolySynth(MonoSynth, {
				oscillator: { type: 'sawtooth' },
				filter: { Q: 2, type: 'lowpass', rolloff: -24 },
				envelope: { attack: 0.01, decay: 0.08, sustain: 0.6, release: 0.18 },
				filterEnvelope: {
					attack: 0.01,
					decay: 0.12,
					sustain: 0.35,
					release: 0.2,
					baseFrequency: 300,
					octaves: 3
				}
			});
	}
}
