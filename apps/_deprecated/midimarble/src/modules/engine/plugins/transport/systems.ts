import { clampMidiTick, getSongMaxTick, getTicksPerSecond } from '../midi';
import { updateTransport } from './lib/transport';
import type { TTransportApp } from './types';

export function advanceTransportSystem(app: TTransportApp, dt = 0) {
	const song = app.r.midiSong;
	if (song == null) {
		if (app.r.transport.mode !== 'paused' || app.r.transport.playheadTick !== 0) {
			updateTransport(app, {
				mode: 'paused',
				playheadTick: 0
			});
		}
		return;
	}

	const maxTick = getSongMaxTick(song);
	const clampedTick = clampMidiTick(app.r.transport.playheadTick, maxTick);
	if (clampedTick !== app.r.transport.playheadTick) {
		updateTransport(app, {
			mode: 'paused',
			playheadTick: clampedTick
		});
		return;
	}

	if (app.r.transport.mode !== 'running') {
		return;
	}

	if (maxTick <= 0) {
		updateTransport(app, {
			mode: 'paused',
			playheadTick: 0
		});
		return;
	}

	const deltaSeconds = Math.max(dt, 0);
	if (deltaSeconds <= 0) {
		return;
	}

	const nextTick = clampMidiTick(
		app.r.transport.playheadTick + deltaSeconds * getTicksPerSecond(song),
		maxTick
	);

	updateTransport(app, {
		mode: nextTick >= maxTick ? 'paused' : 'running',
		playheadTick: nextTick
	});
}
