import * as Haptics from 'expo-haptics';
import { AppState } from 'react-native';
import {
	addAlarmNotificationTappedListener,
	cancelAlarm,
	consumePendingNotificationTap,
	startBackgroundSession,
	stopBackgroundSession
} from '@/modules/alarm';
import { AudioCx } from '../audio';
import type { TTimerConfig } from './TimerCx';

export class TimerAlarm {
	private static NOTIFICATION_ID = 'kairos:timer-alarm';

	private readonly _audioCx: AudioCx;
	private readonly _timerConfig: { get(): TTimerConfig };

	// Incremented on every arm/cancel to invalidate in-flight async arm calls
	private _generation = 0;

	constructor(audioCx: AudioCx, timerConfig: { get(): TTimerConfig }) {
		this._audioCx = audioCx;
		this._timerConfig = timerConfig;
	}

	/** Register the notification tap listener. Returns cleanup. Call on mount. */
	setup(): () => void {
		const onTap = (event: { identifier: string } | null) => {
			if (event?.identifier !== TimerAlarm.NOTIFICATION_ID) return;
			// Stop native session if still running, then hand audio off to JS.
			this.cancel();
			this._audioCx.play(this._timerConfig.get().endSound);
		};

		const sub = addAlarmNotificationTappedListener(onTap);
		// Handle the case where the notification was tapped before JS initialised (app killed).
		onTap(consumePendingNotificationTap());

		return () => sub.remove();
	}

	/**
	 * Schedule the alarm for totalSeconds from now.
	 * Safe to call while a previous arm is still in flight; the generation check
	 * ensures the stale call exits without scheduling.
	 */
	async arm(totalSeconds: number): Promise<void> {
		const gen = ++this._generation;
		const config = this._timerConfig.get();

		try {
			await startBackgroundSession(
				totalSeconds * 1000,
				config.countdownSound,
				config.endSound,
				config.backgroundAlert === 'alarm',
				TimerAlarm.NOTIFICATION_ID
			);
		} catch (e) {
			if (__DEV__) console.error('[TimerAlarm] arm failed:', e);
		}
	}

	/**
	 * Called by TimerCx when the countdown hits zero.
	 * Decides who plays the alarm based on mode and whether the app is foregrounded.
	 */
	onEnd(): void {
		const config = this._timerConfig.get();

		if (AppState.currentState === 'active') {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			if (config.backgroundAlert === 'notification') {
				// Foreground + notification mode: native won't play the alarm, JS takes over
				this.cancel();
				this._audioCx.play(config.endSound);
			}
			// backgroundAlert = 'alarm': native owns the end sound, nothing else needed
		}
		// Backgrounded: native handles it based on nativeAlarm
	}

	/** Invalidate any in-flight arm and clear all native alarm state. */
	cancel(): void {
		this._generation++;
		stopBackgroundSession();
		cancelAlarm(TimerAlarm.NOTIFICATION_ID).catch(() => {});
	}
}
