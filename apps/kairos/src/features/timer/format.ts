import type { TDuration } from './types';

export function durationToSeconds(duration: TDuration): number {
	return duration.h * 3600 + duration.m * 60 + duration.s;
}

export function isSameDuration(a: TDuration, b: TDuration): boolean {
	return a.h === b.h && a.m === b.m && a.s === b.s;
}

export function formatTimerClock(seconds: number): string {
	const total = Math.ceil(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;

	if (h > 0) {
		return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
	}
	return `${pad2(m)}:${pad2(s)}`;
}

export function hasTimerHours(seconds: number): boolean {
	return Math.floor(Math.ceil(seconds) / 3600) > 0;
}

export function formatClockTime(epochMs: number): string {
	const date = new Date(epochMs);
	return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatDurationCompact(duration: TDuration): string {
	const { h, m, s } = duration;

	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0 && s === 0) return `${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	if (s > 0) return `${s}s`;
	return '0s';
}

export function formatDurationLabel(seconds: number): string {
	const total = Math.max(0, Math.ceil(seconds));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);

	if (hours > 0 && minutes > 0) {
		return `${hours} h ${minutes} min`;
	}
	if (hours > 0) {
		return `${hours} h`;
	}
	if (minutes > 0) {
		return `${minutes} min`;
	}
	return `${total} sec`;
}

export function formatDurationRange(min: TDuration, max: TDuration): string {
	const minSeconds = durationToSeconds(min);
	const maxSeconds = durationToSeconds(max);
	const low = Math.min(minSeconds, maxSeconds);
	const high = Math.max(minSeconds, maxSeconds);

	if (low === high) {
		return formatDurationLabel(low);
	}

	return `${formatDurationLabel(low)} - ${formatDurationLabel(high)}`;
}

function pad2(value: number): string {
	return value.toString().padStart(2, '0');
}
