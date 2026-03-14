import {
	pauseTransport,
	resetTransport,
	runTransport,
	seekTransportToStep,
	stepTransportBackward,
	stepTransportForward
} from './lib/transport';
import type { TTransportApp, TTransportPlugin } from './types';

export function createTransportPlugin(): TTransportPlugin {
	return {
		// Transport owns the shared playback mode and playhead step.
		name: 'Transport',
		deps: ['Default'],
		resources: {
			transport: {
				mode: 'paused',
				playheadStep: 0
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
			stepBackward(this: TTransportApp): void {
				stepTransportBackward(this);
			},
			stepForward(this: TTransportApp): void {
				stepTransportForward(this);
			},
			seekToStep(this: TTransportApp, step: number): void {
				seekTransportToStep(this, step);
			}
		}
	};
}
