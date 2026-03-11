// Timeline UI state: zoom level and scroll position.
// Separated from MidiCx so zoom/scroll concerns don't mix with song/playback data.
//
// Key improvements over v1:
// - zoomAtPoint(): zoom preserving the tick under the cursor (no jarring jump)
// - isProgrammaticScroll: flag for NoteGrid to ignore scroll events it triggered
// - setSong(): stores ticksPerBeat so zoomAtPoint math is always correct
// - containerWidth: stored so callers can compute max scroll bounds if needed

import { createState } from 'feature-state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';

const PPB_MIN = 20;
const PPB_MAX = 600;

export class TimelineCx {
	public readonly $pixelsPerBeat = createState(80);
	public readonly $scrollLeft = createState(0);
	public readonly $scrollTop = createState(0);

	// Set by MidiViewer when a song loads — needed for zoomAtPoint tick math.
	public ticksPerBeat = 480;

	// Set by NoteGrid on resize — used for scroll bounds and zoomAtPoint.
	public containerWidth = 0;

	// Set to true before a programmatic DOM scroll, cleared via rAF.
	// NoteGrid's scroll handler checks this to avoid re-syncing back.
	public isProgrammaticScroll = false;

	// MARK: - Song sync

	/** Call when a new song loads so zoom math stays accurate. */
	public setSong(ticksPerBeat: number): void {
		this.ticksPerBeat = ticksPerBeat;
	}

	// MARK: - Zoom

	public setZoom(ppb: number): void {
		const clamped = Math.max(PPB_MIN, Math.min(PPB_MAX, ppb));
		if (this.$pixelsPerBeat.get() === clamped) return;
		this.$pixelsPerBeat.set(clamped);
	}

	public zoomIn(): void {
		this.setZoom(this.$pixelsPerBeat.get() * 1.25);
	}

	public zoomOut(): void {
		this.setZoom(this.$pixelsPerBeat.get() / 1.25);
	}

	/**
	 * Zoom while keeping the tick under clientX fixed in the viewport.
	 *
	 * @param factor  Zoom multiplier (> 1 = in, < 1 = out)
	 * @param clientX Cursor X in viewport coords
	 * @param contentLeft Left edge of the note content area (= containerLeft + PIANO_WIDTH) in viewport coords
	 */
	public zoomAtPoint(factor: number, clientX: number, contentLeft: number): void {
		const ppb = this.$pixelsPerBeat.get();
		const scrollLeft = this.$scrollLeft.get();

		// Mouse position relative to the left edge of the scrollable note content
		const mouseX = clientX - contentLeft;

		// Tick that is currently under the cursor
		const pixelsPerTick = ppb / this.ticksPerBeat;
		const tickAtMouse = (scrollLeft + mouseX) / pixelsPerTick;

		const newPpb = Math.max(PPB_MIN, Math.min(PPB_MAX, ppb * factor));
		if (newPpb === ppb) return;

		// After zoom, scrollLeft needed to keep tickAtMouse under the cursor
		const newPixelsPerTick = newPpb / this.ticksPerBeat;
		const newScrollLeft = Math.max(0, tickAtMouse * newPixelsPerTick - mouseX);

		this.$pixelsPerBeat.set(newPpb);
		this.$scrollLeft.set(newScrollLeft);
	}

	public unmount(): void {
		// Nothing to clean up
	}
}

// MARK: - React context

const ReactTimelineCx = React.createContext<TimelineCx | null>(null);

export const TimelineCxProvider: React.FC<{ children: React.ReactNode }> = (props) => {
	const { children } = props;
	const cx = useMemoCleanup(() => {
		const timelineCx = new TimelineCx();
		return [timelineCx, () => timelineCx.unmount()];
	}, []);
	return <ReactTimelineCx.Provider value={cx}>{children}</ReactTimelineCx.Provider>;
};

export function useTimelineCx(): TimelineCx {
	const cx = React.useContext(ReactTimelineCx);
	if (cx == null) throw new Error('useTimelineCx must be used within TimelineCxProvider');
	return cx;
}
