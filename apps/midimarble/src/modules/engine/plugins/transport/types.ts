import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TEngineSystemSet } from '../../types';

// MARK: - Plugin

export type TTransportPlugin = TPlugin<
	{
		name: 'Transport';
		resources: {
			transport: TRTransport;
		};
		appExtensions: {
			run(): void;
			pause(): void;
			resetTransport(): void;
			stepBackward(): void;
			stepForward(): void;
			seekToStep(step: number): void;
		};
		systemSets: TEngineSystemSet;
	},
	[TDefaultPlugin]
>;

export type TTransportApp = TApp<TAppContext<[TDefaultPlugin, TTransportPlugin]>>;

// MARK: - Resources

export interface TRTransport {
	mode: 'paused' | 'running';
	playheadStep: number;
}
