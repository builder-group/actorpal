import { createState, type TPersistFeature, type TState } from 'feature-state';
import React from 'react';
import { withAsyncStorage } from '@/lib';

export class TimerCx {
	private _interval: ReturnType<typeof setInterval> | null = null;

	public readonly $config: TState<TTimerConfig, [TPersistFeature]>;

	// Runtime
	public readonly $status: TState<TTimerStatus, [TPersistFeature]>;
	public readonly $drawnSeconds: TState<number | null, [TPersistFeature]>;
	public readonly $endTime: TState<number | null, [TPersistFeature]>;
	public readonly $remainingSeconds: TState<number, []>;
	public readonly $pausedRemainingMs: TState<number | null, [TPersistFeature]>;

	constructor() {
		this.$config = withAsyncStorage(
			createState<TTimerConfig>({
				min: { h: 0, m: 1, s: 0 },
				max: { h: 0, m: 5, s: 0 },
				label: 'Timer',
				hideTimer: false,
				sound: 'radar'
			}),
			'kairos:timer:config'
		);

		this.$status = withAsyncStorage(createState<TTimerStatus>('idle'), 'kairos:timer:status');
		this.$drawnSeconds = withAsyncStorage(
			createState<number | null>(null),
			'kairos:timer:drawnSeconds'
		);
		this.$endTime = withAsyncStorage(createState<number | null>(null), 'kairos:timer:endTime');
		this.$remainingSeconds = createState<number>(0);
		this.$pausedRemainingMs = withAsyncStorage(
			createState<number | null>(null),
			'kairos:timer:pausedRemainingMs'
		);
	}

	// MARK: - Lifecycle

	public async mount(): Promise<void> {
		await Promise.all([
			this.$config.persist(),
			this.$status.persist(),
			this.$drawnSeconds.persist(),
			this.$endTime.persist(),
			this.$pausedRemainingMs.persist()
		]);

		const status = this.$status.get();
		const endTime = this.$endTime.get();
		const pausedMs = this.$pausedRemainingMs.get();
		const now = Date.now();

		if (status === 'running') {
			if (endTime != null && endTime > now) {
				this.$remainingSeconds.set((endTime - now) / 1000);
				this._startLoop();
			} else {
				// Alarm fired while app was killed
				this.$remainingSeconds.set(0);
				this.$status.set('done');
			}
		} else if (status === 'paused') {
			this.$remainingSeconds.set(pausedMs != null ? pausedMs / 1000 : 0);
		}
	}

	public unmount(): void {
		this._stopLoop();
	}

	// MARK: - Actions

	public start(): void {
		const { min, max } = this.$config.get();
		const lo = Math.min(this._toSeconds(min), this._toSeconds(max));
		const hi = Math.max(this._toSeconds(min), this._toSeconds(max));
		const drawnSeconds = lo === hi ? lo : Math.round(lo + Math.random() * (hi - lo));
		const endTime = Date.now() + drawnSeconds * 1000;

		this.$drawnSeconds.set(drawnSeconds);
		this.$endTime.set(endTime);
		this.$pausedRemainingMs.set(null);
		this.$status.set('running');

		this.$remainingSeconds.set(drawnSeconds);
		this._startLoop();
	}

	public pause(): void {
		const endTime = this.$endTime.get();
		if (endTime == null) return;

		this._stopLoop();
		const pausedMs = Math.max(0, endTime - Date.now());
		this.$pausedRemainingMs.set(pausedMs);
		this.$status.set('paused');
		this.$remainingSeconds.set(pausedMs / 1000);
	}

	public resume(): void {
		const pausedMs = this.$pausedRemainingMs.get();
		if (pausedMs == null) return;

		const newEndTime = Date.now() + pausedMs;
		this.$endTime.set(newEndTime);
		this.$status.set('running');
		this.$remainingSeconds.set(pausedMs / 1000);
		this._startLoop();
	}

	public cancel(): void {
		this._stopLoop();
		this.$status.set('idle');
		this.$drawnSeconds.set(null);
		this.$endTime.set(null);
		this.$pausedRemainingMs.set(null);
		this.$remainingSeconds.set(0);
	}

	// MARK: - Tick loop

	private _startLoop(): void {
		this._stopLoop();
		this._interval = setInterval(() => this._tick(), 200);
	}

	private _stopLoop(): void {
		if (this._interval != null) {
			clearInterval(this._interval);
			this._interval = null;
		}
	}

	private _tick(): void {
		const endTime = this.$endTime.get();
		if (endTime == null) return;

		const remaining = Math.max(0, (endTime - Date.now()) / 1000);
		this.$remainingSeconds.set(remaining);

		if (remaining === 0) {
			this._onAlarmFired();
		}
	}

	private _onAlarmFired(): void {
		this._stopLoop();
		this.$remainingSeconds.set(0);
		this.$status.set('done');
	}

	// MARK: - Helpers

	private _toSeconds(d: TDuration): number {
		return d.h * 3600 + d.m * 60 + d.s;
	}
}

export type TTimerStatus = 'idle' | 'running' | 'paused' | 'done';
export type TTimerSound = 'radar' | 'bell';

export interface TDuration {
	h: number;
	m: number;
	s: number;
}

export interface TTimerConfig {
	min: TDuration;
	max: TDuration;
	label: string;
	hideTimer: boolean;
	sound: TTimerSound;
}

// MARK: - React Context

const TimerCxContext = React.createContext<TimerCx | null>(null);

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [cx] = React.useState(() => new TimerCx());

	React.useEffect(() => {
		cx.mount();
		return () => cx.unmount();
	}, [cx]);

	return <TimerCxContext.Provider value={cx}>{children}</TimerCxContext.Provider>;
};

export function useTimerCx(): TimerCx {
	const cx = React.useContext(TimerCxContext);
	if (cx == null) {
		throw new Error('useTimerCx must be used within a TimerCxProvider');
	}
	return cx;
}
