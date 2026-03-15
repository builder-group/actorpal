import { createState } from 'feature-state';
import React from 'react';
import { clampMidiTick, type TMidiSong } from '@/modules/engine/plugins/midi';
import type { TTimelineEditableNote } from '../../lib/timeline-editing';
import {
	DEFAULT_PIXELS_PER_BEAT,
	getPixelsPerTick,
	MAX_PIXELS_PER_BEAT,
	MIN_PIXELS_PER_BEAT,
	PIANO_WIDTH,
	ZOOM_STEP_FACTOR
} from '../../lib/timeline-layout';

export type TTimelineKeyboardMode = 'adaptive' | 'full88';

export type TTimelineInteractionState =
	| { mode: 'idle' }
	| {
			mode: 'drawing';
			pointerId: number;
			anchorTick: number;
			currentTick: number;
			noteNumber: number;
			didDrag: boolean;
			pointerDownClient: { x: number; y: number };
	  }
	| {
			mode: 'moving';
			pointerId: number;
			anchorTick: number;
			currentTick: number;
			anchorNoteNumber: number;
			currentNoteNumber: number;
			didDrag: boolean;
			pointerDownClient: { x: number; y: number };
			clickedNote: TTimelineEditableNote;
			notes: TTimelineEditableNote[];
	  }
	| {
			mode: 'resizing-start' | 'resizing-end';
			pointerId: number;
			anchorTick: number;
			currentTick: number;
			note: TTimelineEditableNote;
	  };

export class TimelineCx {
	public readonly scrollContainerRef = React.createRef<HTMLDivElement>();
	public readonly $containerWidth = createState(0);
	public readonly $scrollLeft = createState(0);
	public readonly $pixelsPerBeat = createState(DEFAULT_PIXELS_PER_BEAT);
	public readonly $keyboardMode = createState<TTimelineKeyboardMode>('adaptive');
	public readonly $interactionState = createState<TTimelineInteractionState>({ mode: 'idle' });

	public unmount(): void {
		// No-op for now. Keep symmetry with other local Cx helpers.
	}

	public setContainerWidth(width: number): void {
		const nextWidth = Math.max(0, width);
		if (this.$containerWidth.get() !== nextWidth) {
			this.$containerWidth.set(nextWidth);
		}
	}

	public setScrollLeft(scrollLeft: number): void {
		const nextScrollLeft = Math.max(0, scrollLeft);
		if (this.$scrollLeft.get() !== nextScrollLeft) {
			this.$scrollLeft.set(nextScrollLeft);
		}
	}

	public getPixelsPerTick(song: Pick<TMidiSong, 'ticksPerBeat'> | null): number {
		return getPixelsPerTick(song, this.$pixelsPerBeat.get());
	}

	public getSongWidth(song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>): number {
		return Math.max(song.totalTicks * this.getPixelsPerTick(song), 1);
	}

	public getInnerWidth(song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>): number {
		return Math.max(PIANO_WIDTH + this.getSongWidth(song), this.$containerWidth.get());
	}

	public getTimelineWidth(song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>): number {
		return Math.max(this.getInnerWidth(song) - PIANO_WIDTH, 1);
	}

	public getZoomRatio(): number {
		return this.$pixelsPerBeat.get() / DEFAULT_PIXELS_PER_BEAT;
	}

	public setKeyboardMode(mode: TTimelineKeyboardMode): void {
		if (this.$keyboardMode.get() !== mode) {
			this.$keyboardMode.set(mode);
		}
	}

	public setInteractionState(state: TTimelineInteractionState): void {
		this.$interactionState.set(state);
	}

	public clearInteractionState(): void {
		if (this.$interactionState.get().mode !== 'idle') {
			this.$interactionState.set({ mode: 'idle' });
		}
	}

	public getTickAtClientX(
		song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>,
		clientX: number
	): number {
		const scrollContainer = this.scrollContainerRef.current;
		const pixelsPerTick = this.getPixelsPerTick(song);
		if (scrollContainer == null || pixelsPerTick <= 0) {
			return 0;
		}

		const rect = scrollContainer.getBoundingClientRect();
		const notePx = clientX - rect.left + scrollContainer.scrollLeft - PIANO_WIDTH;
		return clampMidiTick(notePx / pixelsPerTick, song.totalTicks);
	}

	public zoomIn(song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>): void {
		this.zoomAtClientX(song, this.getViewportCenterX(), ZOOM_STEP_FACTOR);
	}

	public zoomOut(song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>): void {
		this.zoomAtClientX(song, this.getViewportCenterX(), 1 / ZOOM_STEP_FACTOR);
	}

	public zoomAtClientX(
		song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>,
		clientX: number,
		factor: number
	): void {
		const scrollContainer = this.scrollContainerRef.current;
		if (scrollContainer == null) {
			return;
		}

		const currentPixelsPerBeat = this.$pixelsPerBeat.get();
		const nextPixelsPerBeat = clampPixelsPerBeat(currentPixelsPerBeat * factor);
		if (nextPixelsPerBeat === currentPixelsPerBeat) {
			return;
		}

		const rect = scrollContainer.getBoundingClientRect();
		const noteViewportX = Math.max(0, clientX - rect.left - PIANO_WIDTH);
		const currentPixelsPerTick = getPixelsPerTick(song, currentPixelsPerBeat);
		if (currentPixelsPerTick <= 0) {
			return;
		}

		const tickAtPointer = clampMidiTick(
			(scrollContainer.scrollLeft + noteViewportX) / currentPixelsPerTick,
			song.totalTicks
		);
		const nextPixelsPerTick = getPixelsPerTick(song, nextPixelsPerBeat);
		const nextScrollLeft = tickAtPointer * nextPixelsPerTick - noteViewportX;
		this.syncViewport(song, nextScrollLeft, nextPixelsPerBeat);
	}

	public syncViewport(
		song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>,
		scrollLeft: number,
		pixelsPerBeat = this.$pixelsPerBeat.get()
	): void {
		const nextPixelsPerBeat = clampPixelsPerBeat(pixelsPerBeat);
		const nextScrollLeft = this.clampScrollLeft(song, scrollLeft, nextPixelsPerBeat);

		this.$pixelsPerBeat.set(nextPixelsPerBeat);
		this.setScrollLeft(nextScrollLeft);

		const scrollContainer = this.scrollContainerRef.current;
		if (scrollContainer != null) {
			scrollContainer.scrollLeft = nextScrollLeft;
		}
	}

	private getViewportCenterX(): number {
		const scrollContainer = this.scrollContainerRef.current;
		if (scrollContainer == null) {
			return 0;
		}

		const rect = scrollContainer.getBoundingClientRect();
		return rect.left + rect.width / 2;
	}

	private clampScrollLeft(
		song: Pick<TMidiSong, 'totalTicks' | 'ticksPerBeat'>,
		scrollLeft: number,
		pixelsPerBeat = this.$pixelsPerBeat.get()
	): number {
		const maxScrollLeft = Math.max(
			0,
			Math.max(
				PIANO_WIDTH + Math.max(song.totalTicks * getPixelsPerTick(song, pixelsPerBeat), 1),
				this.$containerWidth.get()
			) - this.$containerWidth.get()
		);
		return Math.max(0, Math.min(maxScrollLeft, scrollLeft));
	}
}

function clampPixelsPerBeat(pixelsPerBeat: number): number {
	if (!Number.isFinite(pixelsPerBeat)) {
		return DEFAULT_PIXELS_PER_BEAT;
	}

	return Math.max(MIN_PIXELS_PER_BEAT, Math.min(MAX_PIXELS_PER_BEAT, pixelsPerBeat));
}

export function useTimelineState<T>(state: {
	get(): T;
	listen(listener: () => void): () => void;
}): T {
	return React.useSyncExternalStore(
		(onStoreChange) => state.listen(onStoreChange),
		() => state.get(),
		() => state.get()
	);
}
