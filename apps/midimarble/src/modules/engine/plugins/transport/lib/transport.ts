import type { TTransportApp } from '../types';

type TTransportAccess = {
	r: Pick<TTransportApp['r'], 'transport'>;
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
	updateTransport(app, { mode: 'running' });
}

export function pauseTransport(app: TTransportAccess): void {
	updateTransport(app, { mode: 'paused' });
}

export function resetTransport(app: TTransportAccess): void {
	updateTransport(app, {
		mode: 'paused',
		playheadStep: 0
	});
}

export function seekTransportToStep(app: TTransportAccess, step: number): void {
	updateTransport(app, {
		playheadStep: Math.max(0, Math.round(step))
	});
}

export function stepTransportBackward(app: TTransportAccess): void {
	seekTransportToStep(app, app.r.transport.playheadStep - 1);
}

export function stepTransportForward(app: TTransportAccess): void {
	seekTransportToStep(app, app.r.transport.playheadStep + 1);
}
