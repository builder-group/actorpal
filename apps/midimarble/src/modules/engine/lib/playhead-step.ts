export function clampPlayheadStep(step: number, bufferedStep: number): number {
	return Math.max(0, Math.min(Math.round(step), bufferedStep));
}
