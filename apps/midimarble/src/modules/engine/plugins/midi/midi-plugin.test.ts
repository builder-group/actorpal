import { createApp, createDefaultPlugin } from 'ecsify';
import { describe, expect, it } from 'vitest';
import { ENGINE_SYSTEM_SETS } from '../../types';
import { createMidiPlugin } from './midi-plugin';

describe('midi plugin', () => {
	it('imports a midi file and selects the first track with notes', async () => {
		const app = createApp({
			plugins: [createDefaultPlugin(), createMidiPlugin()] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

		await app.loadMidiFile(new File([createTestMidiBuffer()], 'demo.mid', { type: 'audio/midi' }));

		expect(app.r.midiSong?.name).toBe('Demo');
		expect(app.r.selectedTrackId).toBe(0);
		expect(app.r.midiImportError).toBeNull();
	});

	it('stores an import error for invalid midi data', async () => {
		const app = createApp({
			plugins: [createDefaultPlugin(), createMidiPlugin()] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

		await app.loadMidiFile(new File([new Uint8Array([0x00, 0x01, 0x02])], 'broken.mid'));

		expect(app.r.midiSong).toBeNull();
		expect(app.r.selectedTrackId).toBeNull();
		expect(app.r.midiImportError).toBe('Not a valid MIDI file. Missing MThd header.');
	});
});

function createTestMidiBuffer(): ArrayBuffer {
	const bytes = Uint8Array.from([
		0x4d, 0x54, 0x68, 0x64,
		0x00, 0x00, 0x00, 0x06,
		0x00, 0x01,
		0x00, 0x02,
		0x01, 0xe0,
		0x4d, 0x54, 0x72, 0x6b,
		0x00, 0x00, 0x00, 0x13,
		0x00, 0xff, 0x03, 0x04, 0x44, 0x65, 0x6d, 0x6f,
		0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20,
		0x00, 0xff, 0x2f, 0x00,
		0x4d, 0x54, 0x72, 0x6b,
		0x00, 0x00, 0x00, 0x1d,
		0x00, 0xff, 0x03, 0x04, 0x4c, 0x65, 0x61, 0x64,
		0x00, 0x90, 0x3c, 0x64,
		0x83, 0x60, 0x80, 0x3c, 0x40,
		0x00, 0x90, 0x40, 0x64,
		0x81, 0x70, 0x80, 0x40, 0x40,
		0x00, 0xff, 0x2f, 0x00
	]);

	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
