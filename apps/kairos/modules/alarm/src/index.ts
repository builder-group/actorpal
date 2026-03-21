import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

const AlarmModule = requireNativeModule<TAlarmModule>('Alarm');

interface TAlarmModule {
	startBackgroundSession(
		durationMs: number,
		countdownSoundFile: string | null,
		endSoundName: string,
		nativeAlarm: boolean,
		notificationId: string
	): Promise<void>;
	stopBackgroundSession(): void;
	requestAlarmPermission(): Promise<boolean>;
	getNotificationPermissionStatus(): Promise<TNotificationPermissionStatus>;
	scheduleAlarm(id: string, endTimeMs: number, soundFile: string): Promise<void>;
	prepareNotificationSound(soundName: string): Promise<string>;
	previewSessionSound(soundFile: string): Promise<void>;
	previewEndSound(soundName: string): Promise<void>;
	cancelAlarm(id: string): Promise<void>;
	consumePendingNotificationTap(): TAlarmNotificationTap | null;
	addListener(
		eventName: 'onAlarmNotificationTapped',
		listener: (event: TAlarmNotificationTap) => void
	): EventSubscription;
}

interface TAlarmNotificationTap {
	identifier: string;
}

/**
 * Starts a background-audio session for ticking and arms a native end alarm plus
 * a local-notification fallback.
 */
export async function startBackgroundSession(
	durationMs: number,
	countdownSoundFile: string | null,
	endSoundName: string,
	nativeAlarm: boolean,
	notificationId: string
): Promise<void> {
	return AlarmModule.startBackgroundSession(
		durationMs,
		countdownSoundFile,
		endSoundName,
		nativeAlarm,
		notificationId
	);
}

/** Stops any ticking/alarm background session and clears its notification fallback. */
export function stopBackgroundSession(): void {
	AlarmModule.stopBackgroundSession();
}

export async function requestAlarmPermission(): Promise<boolean> {
	return AlarmModule.requestAlarmPermission();
}

export async function getNotificationPermissionStatus(): Promise<TNotificationPermissionStatus> {
	return AlarmModule.getNotificationPermissionStatus();
}

export type TNotificationPermissionStatus =
	| 'notDetermined'
	| 'denied'
	| 'authorized'
	| 'provisional'
	| 'ephemeral';

/**
 * Schedules a local notification at endTimeMs (Unix ms) with a stable identifier.
 * soundFile must be a bare filename previously returned by Alarm.prepareNotificationSound.
 */
export async function scheduleAlarm(
	id: string,
	endTimeMs: number,
	soundFile: string
): Promise<void> {
	return AlarmModule.scheduleAlarm(id, endTimeMs, soundFile);
}

/**
 * Renders the selected alarm into a notification-safe CAF file so the system fallback
 * can use the same sound when native playback is unavailable.
 */
export async function prepareNotificationSound(soundName: string): Promise<string> {
	return AlarmModule.prepareNotificationSound(soundName);
}

/** Plays the session sound once; used for in-config preview of bundled sounds. */
export async function previewSessionSound(soundFile: string): Promise<void> {
	return AlarmModule.previewSessionSound(soundFile);
}

/** Plays the end sound once; used for in-config preview of system/ringtone sounds. */
export async function previewEndSound(soundName: string): Promise<void> {
	return AlarmModule.previewEndSound(soundName);
}

export async function cancelAlarm(id: string): Promise<void> {
	return AlarmModule.cancelAlarm(id);
}

export function addAlarmNotificationTappedListener(
	listener: (event: TAlarmNotificationTap) => void
): EventSubscription {
	return AlarmModule.addListener('onAlarmNotificationTapped', listener);
}

export function consumePendingNotificationTap(): TAlarmNotificationTap | null {
	return AlarmModule.consumePendingNotificationTap();
}
