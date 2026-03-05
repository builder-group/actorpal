import * as Haptics from 'expo-haptics';
import { createState, type TPersistFeature, type TState } from 'feature-state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { withAsyncStorage } from '@/lib';
import { AudioCx, useAudioCx } from '../audio';
import { durationToSeconds } from './format';
import { TDuration } from './types';

export class TimerCx {
	private readonly _audioCx: AudioCx;
	private _interval: ReturnType<typeof setInterval> | null = null;

	public readonly $config: TState<TTimerConfig, [TPersistFeature]>;
	public readonly $status: TState<TTimerStatus, [TPersistFeature]>;

	public readonly $totalSeconds: TState<number | null, [TPersistFeature]>;
	public readonly $remainingSeconds: TState<number, []>;
	public readonly $overtimeSeconds: TState<number, []>;

	public readonly $remainingAtStart: TState<number, [TPersistFeature]>;
	public readonly $startedAt: TState<number | null, [TPersistFeature]>;

	constructor(audioCx: AudioCx) {
		this._audioCx = audioCx;
		this.$config = withAsyncStorage(
			createState<TTimerConfig>({
				min: { h: 0, m: 1, s: 0 },
				max: { h: 0, m: 5, s: 0 },
				label: 'Timer',
				hideTimer: false,
				sound: 'Radar',
				endMode: 'overtime',
				endAfterSeconds: 5
			}),
			'kairos:timer:config'
		);

		this.$status = withAsyncStorage(createState<TTimerStatus>('idle'), 'kairos:timer:status');
		this.$totalSeconds = withAsyncStorage(
			createState<number | null>(null),
			'kairos:timer:totalSeconds'
		);
		this.$startedAt = withAsyncStorage(createState<number | null>(null), 'kairos:timer:startedAt');
		this.$remainingAtStart = withAsyncStorage(
			createState<number>(0),
			'kairos:timer:remainingAtStart'
		);
		this.$remainingSeconds = createState<number>(0);
		this.$overtimeSeconds = createState<number>(0);
	}

	// MARK: - Lifecycle

	public async mount(): Promise<void> {
		await Promise.all([
			this.$config.persist(),
			this.$status.persist(),
			this.$totalSeconds.persist(),
			this.$startedAt.persist(),
			this.$remainingAtStart.persist()
		]);

		const status = this.$status.get();
		const startedAt = this.$startedAt.get();
		const remainingAtStart = this.$remainingAtStart.get();
		const now = Date.now();

		if (status === 'running') {
			if (startedAt != null) {
				const elapsed = (now - startedAt) / 1000;
				if (elapsed < remainingAtStart) {
					this.$remainingSeconds.set(remainingAtStart - elapsed);
					this._startLoop();
				} else {
					this._recoverOvertime(startedAt, remainingAtStart, now);
				}
			} else {
				this.$status.set('idle');
			}
		} else if (status === 'overtime') {
			if (startedAt != null) {
				this._recoverOvertime(startedAt, remainingAtStart, now);
			} else {
				this.$status.set('idle');
			}
		} else if (status === 'paused') {
			this.$remainingSeconds.set(remainingAtStart);
		}
	}

	public unmount(): void {
		this._stopLoop();
	}

	// MARK: - Actions

	public start(): void {
		this._audioCx.stop();
		const { min, max } = this.$config.get();
		const lo = Math.min(durationToSeconds(min), durationToSeconds(max));
		const hi = Math.max(durationToSeconds(min), durationToSeconds(max));
		const totalSeconds = lo === hi ? lo : Math.round(lo + Math.random() * (hi - lo));
		const now = Date.now();

		this.$totalSeconds.set(totalSeconds);
		this.$startedAt.set(now);
		this.$remainingAtStart.set(totalSeconds);
		this.$overtimeSeconds.set(0);
		this.$status.set('running');
		this.$remainingSeconds.set(totalSeconds);
		this._startLoop();
	}

	public pause(): void {
		if (this.$status.get() !== 'running') {
			return;
		}

		const startedAt = this.$startedAt.get();
		const remainingAtStart = this.$remainingAtStart.get();
		if (startedAt == null) {
			return;
		}

		const remaining = Math.max(0, remainingAtStart - (Date.now() - startedAt) / 1000);

		this._stopLoop();
		this.$startedAt.set(null);
		this.$remainingAtStart.set(remaining);
		this.$status.set('paused');
		this.$remainingSeconds.set(remaining);
	}

	public resume(): void {
		if (this.$status.get() !== 'paused') {
			return;
		}

		const now = Date.now();
		this.$startedAt.set(now);
		this.$status.set('running');
		this.$remainingSeconds.set(this.$remainingAtStart.get());
		this._startLoop();
	}

	public cancel(): void {
		this._audioCx.stop();
		this._stopLoop();
		this.$status.set('idle');
		this.$totalSeconds.set(null);
		this.$startedAt.set(null);
		this.$remainingAtStart.set(0);
		this.$remainingSeconds.set(0);
		this.$overtimeSeconds.set(0);
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
		const startedAt = this.$startedAt.get();
		const remainingAtStart = this.$remainingAtStart.get();
		if (startedAt == null) {
			return;
		}

		const elapsed = (Date.now() - startedAt) / 1000;
		const remaining = Math.max(0, remainingAtStart - elapsed);
		const overtime = Math.max(0, elapsed - remainingAtStart);
		const status = this.$status.get();

		if (status === 'overtime') {
			this.$overtimeSeconds.set(overtime);
			const { endMode, endAfterSeconds } = this.$config.get();
			if (endMode !== 'overtime' && overtime >= endAfterSeconds) {
				this._onAutoEnd();
			}
			return;
		}

		this.$remainingSeconds.set(remaining);
		if (remaining === 0) {
			this.$overtimeSeconds.set(0);
			this.$status.set('overtime');
			this._audioCx.play(this.$config.get().sound);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		}
	}

	private _onAutoEnd(): void {
		const { endMode } = this.$config.get();
		if (endMode === 'loop') {
			this.start();
			return;
		}
		this.cancel();
	}

	// MARK: - Helpers

	private _recoverOvertime(startedAt: number, remainingAtStart: number, now: number): void {
		const elapsed = (now - startedAt) / 1000;
		const overtimeSeconds = Math.max(0, elapsed - remainingAtStart);
		const { endMode, endAfterSeconds } = this.$config.get();

		if (endMode === 'overtime' || overtimeSeconds < endAfterSeconds) {
			this.$remainingSeconds.set(0);
			this.$overtimeSeconds.set(overtimeSeconds);
			this.$status.set('overtime');
			this._startLoop();
		} else if (endMode === 'loop') {
			this.start();
		} else {
			this.cancel();
		}
	}
}

export type TTimerStatus = 'idle' | 'running' | 'paused' | 'overtime';
export type TTimerSound = string;
export type TTimerEndMode = 'overtime' | 'stop' | 'loop';

export interface TTimerConfig {
	min: TDuration;
	max: TDuration;
	label: string;
	hideTimer: boolean;
	sound: TTimerSound;
	endMode: TTimerEndMode;
	/** Seconds of overtime before auto-stop or auto-loop triggers. Ignored when endMode is 'overtime'. */
	endAfterSeconds: number;
}

// MARK: - React Context

const TimerCxContext = React.createContext<TimerCx | null>(null);

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const audioCx = useAudioCx();
	const cx = useMemoCleanup(() => {
		const instance = new TimerCx(audioCx);
		return [instance, () => instance.unmount()];
	}, [audioCx]);

	React.useEffect(() => {
		cx.mount();
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
