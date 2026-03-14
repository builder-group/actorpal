import {
	pauseTransport,
	resetTransport,
	runTransport,
	seekTransportToTick,
	stepTransportBackwardTick,
	stepTransportForwardTick
} from './lib/transport';
import { advanceTransportSystem } from './systems';
import type { TTransportApp, TTransportPlugin } from './types';

export function createTransportPlugin(): TTransportPlugin {
	return {
		// Transport owns shared playback mode and the tick-first playhead.
		name: 'Transport',
		deps: ['Default', 'Midi'],
		resources: {
			transport: {
				mode: 'paused',
				playheadTick: 0
			}
		},
		appExtensions: {
			run(this: TTransportApp): void {
				runTransport(this);
			},
			pause(this: TTransportApp): void {
				pauseTransport(this);
			},
			resetTransport(this: TTransportApp): void {
				resetTransport(this);
			},
			stepBackwardTick(this: TTransportApp): void {
				stepTransportBackwardTick(this);
			},
			stepForwardTick(this: TTransportApp): void {
				stepTransportForwardTick(this);
			},
			seekToTick(this: TTransportApp, tick: number): void {
				seekTransportToTick(this, tick);
			}
		},
		setup(app: TTransportApp) {
			app.addSystem(advanceTransportSystem, { set: 'Update' });
		}
	};
}
