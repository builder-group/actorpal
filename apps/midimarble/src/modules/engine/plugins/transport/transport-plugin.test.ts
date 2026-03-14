import { createApp, createDefaultPlugin } from 'ecsify';
import { describe, expect, it } from 'vitest';
import { ENGINE_SYSTEM_SETS } from '../../types';
import { createTransportPlugin } from './transport-plugin';

describe('transport plugin', () => {
	it('starts paused at step 0', () => {
		const app = createTransportApp();

		expect(app.r.transport).toEqual({
			mode: 'paused',
			playheadStep: 0
		});
	});

	it('updates playback mode through run and pause', () => {
		const app = createTransportApp();

		app.run();
		expect(app.r.transport.mode).toBe('running');

		app.pause();
		expect(app.r.transport.mode).toBe('paused');
	});

	it('clamps seek and backward stepping at zero', () => {
		const app = createTransportApp();

		app.seekToStep(-4);
		expect(app.r.transport.playheadStep).toBe(0);

		app.stepBackward();
		expect(app.r.transport.playheadStep).toBe(0);
	});

	it('steps forward and resets back to step 0', () => {
		const app = createTransportApp();

		app.stepForward();
		app.stepForward();
		expect(app.r.transport.playheadStep).toBe(2);

		app.resetTransport();
		expect(app.r.transport).toEqual({
			mode: 'paused',
			playheadStep: 0
		});
	});
});

function createTransportApp() {
	return createApp({
		plugins: [createDefaultPlugin(), createTransportPlugin()] as const,
		systemSets: [...ENGINE_SYSTEM_SETS]
	});
}
