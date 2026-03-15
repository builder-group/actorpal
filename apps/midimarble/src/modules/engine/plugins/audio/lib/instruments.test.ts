import { describe, expect, it } from 'vitest';
import {
	AUDIO_INSTRUMENT_OPTIONS,
	DEFAULT_AUDIO_INSTRUMENT_ID,
	getTrackInstrumentId,
	isAudioInstrumentId
} from './instruments';

describe('audio instrument helpers', () => {
	it('falls back to the bell preset when a track has no override', () => {
		expect(getTrackInstrumentId({}, 4)).toBe(DEFAULT_AUDIO_INSTRUMENT_ID);
	});

	it('returns the explicit track override when present', () => {
		expect(getTrackInstrumentId({ 4: 'lead' }, 4)).toBe('lead');
	});

	it('recognizes instrument ids from the catalog', () => {
		expect(AUDIO_INSTRUMENT_OPTIONS.map((option) => option.id)).toEqual([
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
