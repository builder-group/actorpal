import type { TMidiNote } from '@/modules/engine/plugins/midi';

export interface TTimelineEditableNote extends Pick<
	TMidiNote,
	'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'
> {}

export function getSnappedTimelineTick(
	tick: number,
	ticksPerBeat: number,
	pixelsPerTick: number,
	thresholdPx: number
): number {
	const normalizedTick = Math.max(0, Math.round(tick));
	if (ticksPerBeat <= 0 || pixelsPerTick <= 0 || thresholdPx <= 0) {
		return normalizedTick;
	}

	const snappedTick = Math.round(normalizedTick / ticksPerBeat) * ticksPerBeat;
	return Math.abs((normalizedTick - snappedTick) * pixelsPerTick) <= thresholdPx
		? snappedTick
		: normalizedTick;
}

export function getSnappedMoveDeltaTick(
	referenceTick: number,
	deltaTick: number,
	ticksPerBeat: number,
	pixelsPerTick: number,
	thresholdPx: number
): number {
	const normalizedReferenceTick = Math.max(0, Math.round(referenceTick));
	const normalizedDeltaTick = Math.round(deltaTick);
	const snappedTargetTick = getSnappedTimelineTick(
		normalizedReferenceTick + normalizedDeltaTick,
		ticksPerBeat,
		pixelsPerTick,
		thresholdPx
	);
	return snappedTargetTick - normalizedReferenceTick;
}

export function getClampedMoveDeltaTick(notes: TTimelineEditableNote[], deltaTick: number): number {
	const roundedDeltaTick = Math.round(deltaTick);
	const minTick = Math.min(...notes.map((note) => note.tick));
	return Math.max(-minTick, roundedDeltaTick);
}

export function getClampedMoveDeltaNoteNumber(
	notes: TTimelineEditableNote[],
	deltaNoteNumber: number
): number {
	const roundedDeltaNoteNumber = Math.round(deltaNoteNumber);
	const minNoteNumber = Math.min(...notes.map((note) => note.noteNumber));
	const maxNoteNumber = Math.max(...notes.map((note) => note.noteNumber));
	return Math.max(-minNoteNumber, Math.min(127 - maxNoteNumber, roundedDeltaNoteNumber));
}

export function buildMovedTimelineNotes(
	notes: TTimelineEditableNote[],
	deltaTick: number,
	deltaNoteNumber: number
): TTimelineEditableNote[] {
	const clampedDeltaTick = getClampedMoveDeltaTick(notes, deltaTick);
	const clampedDeltaNoteNumber = getClampedMoveDeltaNoteNumber(notes, deltaNoteNumber);

	return notes.map((note) => ({
		...note,
		tick: Math.max(0, Math.round(note.tick + clampedDeltaTick)),
		noteNumber: clampNoteNumber(note.noteNumber + clampedDeltaNoteNumber)
	}));
}

export function buildResizedTimelineNote(
	note: TTimelineEditableNote,
	edge: 'start' | 'end',
	deltaTick: number
): TTimelineEditableNote {
	const roundedDelta = Math.round(deltaTick);
	const noteEndTick = note.tick + note.durationTicks;

	if (edge === 'start') {
		const nextTick = Math.max(0, Math.min(noteEndTick - 1, note.tick + roundedDelta));
		return {
			...note,
			tick: nextTick,
			durationTicks: noteEndTick - nextTick
		};
	}

	return {
		...note,
		durationTicks: Math.max(1, note.durationTicks + roundedDelta)
	};
}

export function buildDrawnTimelineNote(
	noteNumber: number,
	anchorTick: number,
	currentTick: number,
	defaultDurationTicks: number
): Pick<TMidiNote, 'tick' | 'durationTicks' | 'noteNumber'> {
	const normalizedAnchorTick = Math.max(0, Math.round(anchorTick));
	const normalizedCurrentTick = Math.max(0, Math.round(currentTick));
	const startTick = Math.min(normalizedAnchorTick, normalizedCurrentTick);
	const endTick = Math.max(normalizedAnchorTick, normalizedCurrentTick);
	const durationTicks = Math.max(
		1,
		endTick - startTick < 2 ? Math.round(defaultDurationTicks) : endTick - startTick
	);

	return {
		tick: startTick,
		durationTicks,
		noteNumber: clampNoteNumber(noteNumber)
	};
}

function clampNoteNumber(noteNumber: number): number {
	if (!Number.isFinite(noteNumber)) {
		return 60;
	}

	return Math.max(0, Math.min(127, Math.round(noteNumber)));
}
