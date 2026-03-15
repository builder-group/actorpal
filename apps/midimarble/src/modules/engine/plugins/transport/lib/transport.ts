import { clampMidiTick, getSongMaxTick } from '../../midi';
import type { TTransportApp } from '../types';

type TTransportAccess = {
	r: Pick<TTransportApp['r'], 'midiSong' | 'transport'>;
	updateResource: TTransportApp['updateResource'];
};

export function updateTransport(
	app: TTransportAccess,
	patch: Partial<TTransportApp['r']['transport']>
): void {
	app.updateResource('transport', {
		...app.r.transport,
		...patch
	});
}

export function runTransport(app: TTransportAccess): void {
	if (app.r.midiSong == null || getSongMaxTick(app.r.midiSong) <= 0) {
		return;
	}

	if (app.r.transport.playheadTick >= getSongMaxTick(app.r.midiSong)) {
		updateTransport(app, {
			mode: 'paused',
			playheadTick: getSongMaxTick(app.r.midiSong)
		});
		return;
	}

	updateTransport(app, { mode: 'running' });
}

export function pauseTransport(app: TTransportAccess): void {
	updateTransport(app, { mode: 'paused' });
}

export function resetTransport(app: TTransportAccess): void {
	updateTransport(app, {
		mode: 'paused',
		playheadTick: 0
	});
}

export function seekTransportToTick(app: TTransportAccess, tick: number): void {
	updateTransport(app, {
		playheadTick: clampMidiTick(tick, getSongMaxTick(app.r.midiSong))
	});
}

export function stepTransportBackwardTick(app: TTransportAccess): void {
	seekTransportToTick(app, app.r.transport.playheadTick - 1);
}

export function stepTransportForwardTick(app: TTransportAccess): void {
	seekTransportToTick(app, app.r.transport.playheadTick + 1);
}
