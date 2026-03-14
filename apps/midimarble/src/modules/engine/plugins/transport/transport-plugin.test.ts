import { createApp, createDefaultPlugin } from 'ecsify';
import { describe, expect, it } from 'vitest';
import { ENGINE_SYSTEM_SETS } from '../../types';
import { createMidiPlugin } from '../midi';
import { createTransportPlugin } from './transport-plugin';

describe('transport plugin', () => {
	it('starts paused at tick 0', () => {
		const app = createTransportApp();

		expect(app.r.transport).toEqual({
			mode: 'paused',
			playheadTick: 0
		});
	});

	it('updates playback mode through run and pause when a song is loaded', () => {
		const app = createTransportApp();
		setTestSong(app);

		app.run();
		expect(app.r.transport.mode).toBe('running');

		app.pause();
		expect(app.r.transport.mode).toBe('paused');
	});

	it('clamps seek and backward stepping at tick 0', () => {
		const app = createTransportApp();
		setTestSong(app);

		app.seekToTick(-4);
		expect(app.r.transport.playheadTick).toBe(0);

		app.stepBackwardTick();
		expect(app.r.transport.playheadTick).toBe(0);
	});

	it('steps forward by one tick and resets back to tick 0', () => {
		const app = createTransportApp();
		setTestSong(app);

		app.stepForwardTick();
		app.stepForwardTick();
		expect(app.r.transport.playheadTick).toBe(2);

		app.resetTransport();
		expect(app.r.transport).toEqual({
			mode: 'paused',
			playheadTick: 0
		});
	});

	it('advances playhead tick from song timing while running', () => {
		const app = createTransportApp();
		setTestSong(app);

		app.run();
		app.update(0.5);

		expect(app.r.transport.playheadTick).toBe(480);
		expect(app.r.transport.mode).toBe('running');
	});

	it('pauses automatically at the end of the song', () => {
		const app = createTransportApp();
		setTestSong(app, 120);

		app.run();
		app.update(1);

		expect(app.r.transport.playheadTick).toBe(120);
		expect(app.r.transport.mode).toBe('paused');
	});
});

function createTransportApp() {
	return createApp({
		plugins: [createDefaultPlugin(), createMidiPlugin(), createTransportPlugin()] as const,
		systemSets: [...ENGINE_SYSTEM_SETS]
	});
}

function setTestSong(app: ReturnType<typeof createTransportApp>, totalTicks = 960): void {
	app.updateResource('midiSong', {
		name: 'Test Song',
		bpm: 120,
		ticksPerBeat: 480,
		totalTicks,
		tracks: [{ id: 0, name: 'Track 1', notes: [] }]
	});
	app.updateResource('selectedTrackId', 0);
}
