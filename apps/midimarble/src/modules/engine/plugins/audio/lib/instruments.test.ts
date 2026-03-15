import { describe, expect, it } from 'vitest';
import { audioConfig } from '../config';
import { getTrackInstrumentId, isAudioInstrumentId } from './instruments';

describe('audio instrument helpers', () => {
	it('falls back to the bell preset when a track has no override', () => {
		expect(getTrackInstrumentId({}, 4)).toBe(audioConfig.defaultInstrumentId);
	});

	it('returns the explicit track override when present', () => {
		expect(getTrackInstrumentId({ 4: 'lead' }, 4)).toBe('lead');
	});

	it('recognizes instrument ids from the catalog', () => {
		expect(audioConfig.instrumentOptions.map((option) => option.id)).toEqual([
			'classic',
			'bell',
			'xylophone',
			'warm',
			'pluck',
			'lead'
		]);
		expect(isAudioInstrumentId('warm')).toBe(true);
		expect(isAudioInstrumentId('xylophone')).toBe(true);
		expect(isAudioInstrumentId('nope')).toBe(false);
	});
});
