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
		expect(app.r.selectedNoteId).toBeNull();
		expect(app.r.selectedNoteIds).toEqual(new Set());
		expect(app.r.nextMidiNoteId).toBe(2);
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
		expect(app.r.selectedNoteId).toBeNull();
		expect(app.r.selectedNoteIds).toEqual(new Set());
		expect(app.r.nextMidiNoteId).toBe(0);
		expect(app.r.midiImportError).toBe('Not a valid MIDI file. Missing MThd header.');
	});

	it('selects and clears the current note id', async () => {
		const app = createApp({
			plugins: [createDefaultPlugin(), createMidiPlugin()] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

		await app.loadMidiFile(new File([createTestMidiBuffer()], 'demo.mid', { type: 'audio/midi' }));

		app.selectNote(0);
		expect(app.r.selectedNoteId).toBe(0);
		expect(app.r.selectedNoteIds).toEqual(new Set([0]));

		app.selectNote(null);
		expect(app.r.selectedNoteId).toBeNull();
		expect(app.r.selectedNoteIds).toEqual(new Set());
	});

	it('creates, moves, resizes, selects, and deletes notes in the selected track', async () => {
		const app = createApp({
			plugins: [createDefaultPlugin(), createMidiPlugin()] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

		await app.loadMidiFile(new File([createTestMidiBuffer()], 'demo.mid', { type: 'audio/midi' }));

		const createdNoteId = app.createNote({
			tick: 720,
			durationTicks: 240,
			noteNumber: 67
		});
		const getSelectedTrack = () =>
			app.r.midiSong?.tracks.find((track) => track.id === app.r.selectedTrackId);

		expect(createdNoteId).toBe(2);
		expect(app.r.nextMidiNoteId).toBe(3);
		expect(app.r.selectedNoteId).toBe(2);
		expect(app.r.selectedNoteIds).toEqual(new Set([2]));
		expect(app.r.midiSong?.totalTicks).toBe(960);

		app.selectAllTrackNotes();
		expect(app.r.selectedNoteIds).toEqual(new Set([0, 1, 2]));
		expect(app.r.selectedNoteId).toBe(2);

		expect(app.moveSelectedNotes(120, 1)).toBe(true);
		expect(getSelectedTrack()?.notes.map((note) => [note.id, note.tick, note.noteNumber])).toEqual([
			[0, 120, 61],
			[1, 600, 65],
			[2, 840, 68]
		]);

		app.selectNotes([2], 2);
		expect(app.resizePrimarySelectedNote('end', -239)).toBe(true);
		expect(getSelectedTrack()?.notes.find((note) => note.id === 2)?.durationTicks).toBe(1);

		expect(app.deleteSelectedNotes()).toBe(1);
		expect(app.r.selectedNoteId).toBeNull();
		expect(app.r.selectedNoteIds).toEqual(new Set());
		expect(getSelectedTrack()?.notes.map((note) => note.id)).toEqual([0, 1]);
	});

	it('keeps selection and deletion scoped to the selected track', () => {
		const app = createApp({
			plugins: [createDefaultPlugin(), createMidiPlugin()] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

		app.updateResource('midiSong', {
			name: 'Demo',
			bpm: 120,
			ticksPerBeat: 480,
			totalTicks: 360,
			tracks: [
				{
					id: 7,
					name: 'Lead',
					notes: [{ id: 1, tick: 0, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 }]
				},
				{
					id: 9,
					name: 'Bass',
					notes: [
						{ id: 2, tick: 120, durationTicks: 120, noteNumber: 48, velocity: 100, channel: 0 }
					]
				}
			]
		} as never);
		app.updateResource('selectedTrackId', 7);

		app.selectNotes([1, 2], 2);
		expect(app.r.selectedNoteIds).toEqual(new Set([1]));
		expect(app.r.selectedNoteId).toBe(1);

		app.updateResource('selectedNoteIds', new Set([2]));
		app.updateResource('selectedNoteId', 2);

		expect(app.deleteSelectedNotes()).toBe(0);
		expect(app.r.selectedNoteIds).toEqual(new Set());
		expect(app.r.selectedNoteId).toBeNull();
		expect(app.r.midiSong?.tracks[1]?.notes.map((note) => note.id)).toEqual([2]);
	});
});

function createTestMidiBuffer(): ArrayBuffer {
	const bytes = Uint8Array.from([
		0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x01, 0x00, 0x02, 0x01, 0xe0, 0x4d, 0x54,
		0x72, 0x6b, 0x00, 0x00, 0x00, 0x13, 0x00, 0xff, 0x03, 0x04, 0x44, 0x65, 0x6d, 0x6f, 0x00, 0xff,
		0x51, 0x03, 0x07, 0xa1, 0x20, 0x00, 0xff, 0x2f, 0x00, 0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00,
		0x1d, 0x00, 0xff, 0x03, 0x04, 0x4c, 0x65, 0x61, 0x64, 0x00, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80,
		0x3c, 0x40, 0x00, 0x90, 0x40, 0x64, 0x81, 0x70, 0x80, 0x40, 0x40, 0x00, 0xff, 0x2f, 0x00
	]);

	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
