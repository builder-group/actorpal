import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { createState, type TState, type TStorageFeature } from 'feature-state';
import React from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { AudioCx, useAudioCx } from '@/features/audio';
import { SettingsCx, useSettingsCx } from '@/features/settings';
import { useMemoCleanup } from '@/hooks';
import { withAsyncStorage, withVersionedAsyncStorage, type TVersionedMigrationConfig } from '@/lib';
import { getNotificationPermissionStatus, requestAlarmPermission } from '@/modules/alarm';
import { timerConfig } from './config';
import { durationToSeconds } from './format';
import { TimerAlarm } from './TimerAlarm';
import { TDuration } from './types';

export class TimerCx {
	private readonly _audioCx: AudioCx;
	private readonly _settingsCx: SettingsCx;

	private _interval: ReturnType<typeof setInterval> | null = null;
	private readonly _alarm: TimerAlarm;
	private readonly _cleanups: Array<() => void> = [];

	public readonly $config: TState<TTimerConfig, [TStorageFeature]>;
	public readonly $status: TState<TTimerStatus, [TStorageFeature]>;

	public readonly $totalSeconds: TState<number | null, [TStorageFeature]>;
	public readonly $remainingSeconds: TState<number, []>;
	public readonly $overtimeSeconds: TState<number, []>;

	public readonly $remainingAtStart: TState<number, [TStorageFeature]>;
	public readonly $startedAt: TState<number | null, [TStorageFeature]>;
	public readonly $recents: TState<TTimerRecent[], [TStorageFeature]>;

	constructor(audioCx: AudioCx, settingsCx: SettingsCx) {
		this._audioCx = audioCx;
		this._settingsCx = settingsCx;
		this.$config = withVersionedAsyncStorage(
			createState<TTimerConfig>({
				version: '0.0.3',
				min: { h: 0, m: 1, s: 0 },
				max: { h: 0, m: 5, s: 0 },
				label: '',
				hideTimeDisplay: false,
				endSound: 'Radar',
				countdownSound: null,
				backgroundAlert: 'notification',
				endMode: { type: 'overtime' }
			}),
			'kairos:timer:config',
			timerConfigMigrationConfig
		);
		this._alarm = new TimerAlarm(audioCx, this.$config);

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
		this.$recents = withAsyncStorage(createState<TTimerRecent[]>([]), 'kairos:timer:recents');
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
			this.$remainingAtStart.persist(),
			this.$recents.persist()
		]);

		this._cleanups.push(this._alarm.setup());
		this._cleanups.push(this.$status.listen(() => this._syncKeepAwake()));
		this._cleanups.push(this._settingsCx.$settings.listen(() => this._syncKeepAwake()));
		this._cleanups.push(
			this.$config.listen(() => {
				if (this.$status.get() !== 'running') return;
				const remaining = this._getRemainingSeconds();
				this._alarm.cancel();
				void this._alarm.arm(remaining);
			})
		);

		const status = this.$status.get();
		const startedAt = this.$startedAt.get();
		const remainingAtStart = this.$remainingAtStart.get();
		const now = Date.now();

		if (status === 'running') {
			if (startedAt != null) {
				const elapsed = (now - startedAt) / 1000;
				if (elapsed < remainingAtStart) {
					const remaining = remainingAtStart - elapsed;
					this.$remainingSeconds.set(remaining);
					this._startLoop();
					void this._alarm.arm(remaining);
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

		this._syncKeepAwake();
	}

	public unmount(): void {
		this._stopLoop();
		this._alarm.cancel();
		void deactivateKeepAwake(timerConfig.keepAwakeTag).catch(() => undefined);
		this._cleanups.forEach((fn) => fn());
		this._cleanups.length = 0;
	}

	// MARK: - Actions

	public async start(options: TTimerStartOptions = {}): Promise<void> {
		this._audioCx.stop();

		const { config: configOverride, recordRecent = true, allowPermissionPrompt = true } = options;
		const config = configOverride ?? this.$config.get();

		await this._requestPermissionIfNeeded(config, allowPermissionPrompt);

		if (configOverride != null) {
			this.$config.set(configOverride);
		}

		const { min, max } = config;
		const lo = Math.min(durationToSeconds(min), durationToSeconds(max));
		const hi = Math.max(durationToSeconds(min), durationToSeconds(max));
		const totalSeconds = lo === hi ? lo : Math.round(lo + Math.random() * (hi - lo));
		const now = Date.now();

		if (recordRecent) {
			this._upsertRecent(config, totalSeconds);
		}

		this.$totalSeconds.set(totalSeconds);
		this.$startedAt.set(now);
		this.$remainingAtStart.set(totalSeconds);
		this.$overtimeSeconds.set(0);
		this.$status.set('running');
		this.$remainingSeconds.set(totalSeconds);
		this._startLoop();
		void this._alarm.arm(totalSeconds);
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
		this._alarm.cancel();
		this.$startedAt.set(null);
		this.$remainingAtStart.set(remaining);
		this.$status.set('paused');
		this.$remainingSeconds.set(remaining);
	}

	public async resume(): Promise<void> {
		if (this.$status.get() !== 'paused') {
			return;
		}

		const config = this.$config.get();
		await this._requestPermissionIfNeeded(config, true);

		const remaining = this.$remainingAtStart.get();
		const now = Date.now();
		this.$startedAt.set(now);
		this.$status.set('running');
		this.$remainingSeconds.set(remaining);
		this._startLoop();
		void this._alarm.arm(remaining);
	}

	public cancel(): void {
		this._audioCx.stop();
		this._stopLoop();
		this._alarm.cancel();
		this.$status.set('idle');
		this.$totalSeconds.set(null);
		this.$startedAt.set(null);
		this.$remainingAtStart.set(0);
		this.$remainingSeconds.set(0);
		this.$overtimeSeconds.set(0);
	}

	public clearRecents(): void {
		this.$recents.set([]);
	}

	public removeRecent(hash: string): void {
		this.$recents.set((current) => current.filter((entry) => entry.hash !== hash));
	}

	public reset(): void {
		this.cancel();
		this.$config.set({
			version: '0.0.3',
			min: { h: 0, m: 1, s: 0 },
			max: { h: 0, m: 5, s: 0 },
			label: '',
			hideTimeDisplay: false,
			endSound: 'Radar',
			countdownSound: null,
			backgroundAlert: 'notification',
			endMode: { type: 'overtime' }
		});
		this.$recents.set([]);
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
			const { endMode } = this.$config.get();
			if (endMode.type !== 'overtime' && overtime >= endMode.delaySeconds) {
				this._onAutoEnd();
			}
			return;
		}

		this.$remainingSeconds.set(remaining);
		if (remaining === 0) {
			this.$overtimeSeconds.set(0);
			this.$status.set('overtime');
			this._alarm.onEnd();
		}
	}

	private _onAutoEnd(): void {
		const { endMode } = this.$config.get();
		if (endMode.type === 'loop') {
			this.start({ recordRecent: false, allowPermissionPrompt: false });
			return;
		}
		this.cancel();
	}

	// MARK: - Helpers

	private _upsertRecent(config: TTimerConfig, lastUsedTotalSeconds: number): void {
		const hash = this._recentHash(config);
		this.$recents.set((current) => {
			const existing = current.find((entry) => entry.hash === hash);
			const now = Date.now();
			const next: TTimerRecent = {
				hash,
				config,
				lastUsedTotalSeconds,
				createdAt: existing?.createdAt ?? now,
				lastUsedAt: now
			};
			const filtered = current.filter((entry) => entry.hash !== hash);
			return [next, ...filtered].slice(0, timerConfig.recentsMaxSize);
		});
	}

	private _recentHash(config: TTimerConfig): string {
		const key = JSON.stringify({
			min: config.min,
			max: config.max,
			label: config.label.trim(),
			hideTimeDisplay: config.hideTimeDisplay,
			endSound: config.endSound,
			countdownSound: config.countdownSound,
			backgroundAlert: config.backgroundAlert,
			endMode: config.endMode
		});

		// Simple stable hash for recent dedupe/list keys.
		let hash = 5381;
		for (let i = 0; i < key.length; i += 1) {
			hash = (hash * 33) ^ key.charCodeAt(i);
		}
		return `timer_${(hash >>> 0).toString(36)}`;
	}

	private _getRemainingSeconds(): number {
		const startedAt = this.$startedAt.get();
		const remainingAtStart = this.$remainingAtStart.get();
		if (startedAt == null) return remainingAtStart;
		return Math.max(0, remainingAtStart - (Date.now() - startedAt) / 1000);
	}

	private _recoverOvertime(startedAt: number, remainingAtStart: number, now: number): void {
		const elapsed = (now - startedAt) / 1000;
		const overtimeSeconds = Math.max(0, elapsed - remainingAtStart);
		const { endMode } = this.$config.get();
		const delaySeconds = endMode.type !== 'overtime' ? endMode.delaySeconds : Infinity;

		if (endMode.type === 'overtime' || overtimeSeconds < delaySeconds) {
			this.$remainingSeconds.set(0);
			this.$overtimeSeconds.set(overtimeSeconds);
			this.$status.set('overtime');
			this._startLoop();
		} else if (endMode.type === 'loop') {
			this.start({ recordRecent: false, allowPermissionPrompt: false });
		} else {
			this.cancel();
		}
	}

	private async _requestPermissionIfNeeded(
		config: TTimerConfig,
		allowPermissionPrompt: boolean
	): Promise<void> {
		if (config.backgroundAlert === 'alarm') {
			return;
		}

		try {
			let status = await getNotificationPermissionStatus();
			if (
				status === 'notDetermined' &&
				allowPermissionPrompt &&
				AppState.currentState === 'active'
			) {
				await requestAlarmPermission();
				status = await getNotificationPermissionStatus();
				if (status === 'denied') {
					await this._showQuietTimerNotificationsNotice();
				}
			}
		} catch {
			// do nothing
		}
	}

	private _showQuietTimerNotificationsNotice(): Promise<void> {
		return new Promise((resolve) => {
			Alert.alert(
				'Notifications Off',
				'Notifications are required if you want Kairos to alert you when the timer finishes while your phone is locked or the app is in the background.',
				[
					{
						text: 'OK',
						style: 'cancel',
						onPress: () => resolve()
					},
					{
						text: 'Open Settings',
						onPress: () => {
							void Linking.openSettings().catch(() => {});
							resolve();
						}
					}
				]
			);
		});
	}

	private _syncKeepAwake(): void {
		if (this._shouldKeepAwake()) {
			void activateKeepAwakeAsync(timerConfig.keepAwakeTag).catch(() => undefined);
			return;
		}

		void deactivateKeepAwake(timerConfig.keepAwakeTag).catch(() => undefined);
	}

	private _shouldKeepAwake(): boolean {
		const { keepScreenAwake } = this._settingsCx.$settings.get().timer;
		const status = this.$status.get();
		return keepScreenAwake && (status === 'running' || status === 'overtime');
	}
}

const timerConfigMigrationConfig: TVersionedMigrationConfig<TTimerConfig> = {
	latestVersion: '0.0.3',
	fallbackVersion: '0.0.1',
	migrations: {
		'0.0.1': {
			to: '0.0.2',
			migrate: (value) => {
				const v = value as Record<string, unknown>;
				return {
					...v,
					sessionEndSound: v['sound'] ?? 'Radar',
					sessionSound: null,
					hideTimeDisplay: v['hideTimeDisplay'] ?? v['hideTimer'] ?? false
				};
			}
		},
		'0.0.2': {
			to: '0.0.3',
			migrate: (value) => {
				const v = value as {
					sessionEndSound: string;
					sessionSound: string | null;
					endMode: 'overtime' | 'stop' | 'loop';
					endAfterSeconds: number;
					[key: string]: unknown;
				};
				const endMode: TTimerEndMode =
					v.endMode === 'overtime'
						? { type: 'overtime' }
						: { type: v.endMode, delaySeconds: v.endAfterSeconds ?? 5 };
				return {
					...v,
					version: '0.0.3',
					backgroundAlert: v.sessionSound != null ? 'alarm' : 'notification',
					endSound: v.sessionEndSound,
					countdownSound: v.sessionSound,
					endMode
				};
			}
		}
	}
};

export type TTimerStatus = 'idle' | 'running' | 'paused' | 'overtime';
export type TTimerEndMode =
	| { type: 'overtime' }
	| { type: 'stop'; delaySeconds: number }
	| { type: 'loop'; delaySeconds: number };
export type TTimerBackgroundAlert = 'notification' | 'alarm';

export interface TTimerConfig {
	version: '0.0.3';
	min: TDuration;
	max: TDuration;
	label: string;
	/** When true, the countdown display is hidden while the timer is running. */
	hideTimeDisplay: boolean;
	/** Alarm sound played when the timer ends. */
	endSound: string;
	/** Sound played while the timer counts down. null = silent background audio. */
	countdownSound: string | null;
	/** How the timer ends when the app is in the background. */
	backgroundAlert: TTimerBackgroundAlert;
	/** What happens after the timer reaches zero. overtime = count up indefinitely; stop = auto-cancel after delaySeconds; loop = auto-restart after delaySeconds. */
	endMode: TTimerEndMode;
}

interface TTimerStartOptions {
	config?: TTimerConfig;
	recordRecent?: boolean;
	allowPermissionPrompt?: boolean;
}

export interface TTimerRecent {
	hash: string;
	config: TTimerConfig;
	lastUsedTotalSeconds: number;
	createdAt: number;
	lastUsedAt: number;
}

// MARK: - React Context

const TimerCxContext = React.createContext<TimerCx | null>(null);

export const TimerCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const settingsCx = useSettingsCx();
	const audioCx = useAudioCx();
	const cx = useMemoCleanup(() => {
		const instance = new TimerCx(audioCx, settingsCx);
		return [instance, () => instance.unmount()];
	}, [audioCx, settingsCx]);

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
