export function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s`;
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}

	if (minutes > 0 && remainingSeconds > 0) {
		return `${minutes}m ${remainingSeconds}s`;
	}

	return `${minutes}m`;
}

export function formatDurationLong(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	const parts: string[] = [];

	if (hours > 0) {
		parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
	}

	if (minutes > 0) {
		parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
	}

	if (remainingSeconds > 0 || parts.length === 0) {
		parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`);
	}

	return parts.join(', ');
}
