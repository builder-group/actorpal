import * as Haptics from 'expo-haptics';
import { AppState } from 'react-native';
import {
	addAlarmNotificationTappedListener,
	cancelAlarm,
	consumePendingNotificationTap,
	getNotificationPermissionStatus,
	prepareNotificationSound,
	requestAlarmPermission,
	scheduleAlarm,
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
			this._audioCx.play(this._timerConfig.get().sessionEndSound);
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
			await this._ensureNotificationPermissionIfNeeded();
			if (gen !== this._generation) return;

			if (config.sessionSound !== null) {
				// Active mode: native audio plays the session sound and owns the transition to
				// the alarm sound. The notification fallback is silent; its only job is to
				// wake the screen if the user locked their phone.
				await startBackgroundSession(
					totalSeconds * 1000,
					config.sessionSound,
					config.sessionEndSound,
					TimerAlarm.NOTIFICATION_ID
				);
			} else {
				// Quiet mode: pre-render the alarm sound into a CAF file the notification
				// system can reference, then schedule the notification as the primary alarm.
				const soundFile = await prepareNotificationSound(config.sessionEndSound);
				if (gen !== this._generation) return;
				stopBackgroundSession();
				await scheduleAlarm(
					TimerAlarm.NOTIFICATION_ID,
					Date.now() + totalSeconds * 1000,
					soundFile
				);
			}
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

		if (config.sessionSound !== null) {
			// Native owns the audio transition; add haptic feedback if the screen is visible.
			if (AppState.currentState === 'active') {
				Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			}
			return;
		}

		if (AppState.currentState === 'active') {
			// Foregrounded: play directly and drop the now-redundant notification.
			this.cancel();
			this._audioCx.play(config.sessionEndSound);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		}
		// Backgrounded: the scheduled notification fires with sound; nothing to do here.
	}

	/** Invalidate any in-flight arm and clear all native alarm state. */
	cancel(): void {
		this._generation++;
		stopBackgroundSession();
		cancelAlarm(TimerAlarm.NOTIFICATION_ID).catch(() => {});
	}

	private async _ensureNotificationPermissionIfNeeded(): Promise<void> {
		try {
			const status = await getNotificationPermissionStatus();
			if (status === 'notDetermined') {
				await requestAlarmPermission();
			}
		} catch {
			// Ignore permission lookup failures and let the native alarm flow decide what it can do
		}
	}
}
