// Viewport state: zoom level and scroll position.
// Intentionally separate from MidiCx so song data and UI state don't mix.
//
// Key patterns:
//   isProgrammaticScroll — set before a JS-driven DOM scroll so the scroll
//     handler in PianoRoll doesn't echo it back into $scrollLeft.
//   zoomAtPoint() — keeps the tick under the cursor fixed during zoom.
//   containerWidth — set by PianoRoll via ResizeObserver; used in zoomAtPoint.

import { createState } from 'feature-state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { MidiLayout, midiConfig } from './lib';
import type { MidiSong } from './types';

export class ViewportCx {
	// MARK: - State

	public readonly $pixelsPerBeat = createState<number>(midiConfig.zoom.defaultPpb);
	public readonly $scrollLeft = createState(0);
	public readonly $scrollTop = createState(0);

	/** Updated by MidiViewer when a song loads — needed for zoomAtPoint. */
	public ticksPerBeat = 480;
	/** Updated by PianoRoll ResizeObserver — needed for zoomAtPoint. */
	public containerWidth = 0;
	/** Set before a programmatic DOM scroll; cleared via rAF. */
	public isProgrammaticScroll = false;

	// MARK: - Song sync

	public setSong(ticksPerBeat: number): void {
		this.ticksPerBeat = ticksPerBeat;
	}

	// MARK: - Zoom

	public setZoom(ppb: number): void {
		const clamped = Math.max(midiConfig.zoom.minPpb, Math.min(midiConfig.zoom.maxPpb, ppb));
		if (this.$pixelsPerBeat.get() === clamped) return;
		this.$pixelsPerBeat.set(clamped);
	}

	public zoomIn(): void {
		this.setZoom(this.$pixelsPerBeat.get() * midiConfig.zoom.stepFactor);
	}

	public zoomOut(): void {
		this.setZoom(this.$pixelsPerBeat.get() / midiConfig.zoom.stepFactor);
	}

	/**
	 * Zoom while keeping the tick under `clientX` fixed in the viewport.
	 *
	 * @param factor      > 1 = zoom in, < 1 = zoom out
	 * @param clientX     Cursor X in viewport coordinates
	 * @param contentLeft Left edge of the notes content area in viewport coordinates
	 *                    (i.e. container.left + keyboardWidth)
	 */
	public zoomAtPoint(factor: number, clientX: number, contentLeft: number): void {
		const ppb = this.$pixelsPerBeat.get();
		const mouseX = clientX - contentLeft;
		const pixelsPerTick = ppb / this.ticksPerBeat;
		const tickAtCursor = (this.$scrollLeft.get() + Math.max(0, mouseX)) / pixelsPerTick;

		const newPpb = Math.max(
			midiConfig.zoom.minPpb,
			Math.min(midiConfig.zoom.maxPpb, ppb * factor)
		);
		if (newPpb === ppb) return;

		const newPixelsPerTick = newPpb / this.ticksPerBeat;
		const newScrollLeft = Math.max(0, tickAtCursor * newPixelsPerTick - Math.max(0, mouseX));

		this.$pixelsPerBeat.set(newPpb);
		this.$scrollLeft.set(newScrollLeft);
	}

	public getLayout(song: MidiSong): MidiLayout {
		return new MidiLayout(this.$pixelsPerBeat.get(), song.ticksPerBeat);
	}

	// MARK: - Lifecycle

	public unmount(): void {
		this.isProgrammaticScroll = false;
	}
}

// MARK: - React context

const ReactViewportCx = React.createContext<ViewportCx | null>(null);

export const ViewportCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const viewportCx = new ViewportCx();
		return [viewportCx, () => viewportCx.unmount()];
	}, []);
	return <ReactViewportCx.Provider value={cx}>{children}</ReactViewportCx.Provider>;
};

export function useViewportCx(): ViewportCx {
	const cx = React.useContext(ReactViewportCx);
	if (cx == null) throw new Error('useViewportCx must be used within ViewportCxProvider');
	return cx;
}
