import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TEngineSystemSet } from '../../types';
import type { TMidiPlugin } from '../midi';

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
			stepBackwardTick(): void;
			stepForwardTick(): void;
			seekToTick(tick: number): void;
		};
		systemSets: TEngineSystemSet;
	},
	[TDefaultPlugin, TMidiPlugin]
>;

export type TTransportApp = TApp<TAppContext<[TDefaultPlugin, TMidiPlugin, TTransportPlugin]>>;

// MARK: - Resources

export interface TRTransport {
	mode: 'paused' | 'running';
	playheadTick: number;
}
