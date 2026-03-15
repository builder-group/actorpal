import { createState } from 'feature-state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { midiConfig, MidiLayout } from './lib';
import type { MidiSong, MidiViewportRect } from './types';

export class MidiViewportCx {
	public readonly scrollContainerRef = React.createRef<HTMLDivElement>();
	public readonly $containerRect = createState<MidiViewportRect>({ width: 0, height: 0, left: 0 });
	public readonly $scrollLeft = createState(0);
	public readonly $scrollTop = createState(0);
	public readonly $pixelsPerBeat = createState<number>(midiConfig.zoom.defaultPixelsPerBeat);

	public isProgrammaticScroll = false;

	public get containerWidth(): number {
		return this.$containerRect.get().width;
	}

	// MARK: - Actions

	public setContainerRect(rect: MidiViewportRect): void {
		this.$containerRect.set(rect);
	}

	public setScrollPosition(scrollLeft: number, scrollTop: number): void {
		this.$scrollLeft.set(Math.max(0, scrollLeft));
		this.$scrollTop.set(Math.max(0, scrollTop));
	}

	public setPixelsPerBeat(value: number): void {
		const clamped = Math.max(
			midiConfig.zoom.minPixelsPerBeat,
			Math.min(midiConfig.zoom.maxPixelsPerBeat, value)
		);
		if (this.$pixelsPerBeat.get() !== clamped) {
			this.$pixelsPerBeat.set(clamped);
		}
	}

	public zoomIn(): void {
		this.setPixelsPerBeat(this.$pixelsPerBeat.get() * midiConfig.zoom.stepFactor);
	}

	public zoomOut(): void {
		this.setPixelsPerBeat(this.$pixelsPerBeat.get() / midiConfig.zoom.stepFactor);
	}

	public zoomAtClientX(song: MidiSong, clientX: number, notesLeft: number, factor: number): void {
		const currentPixelsPerBeat = this.$pixelsPerBeat.get();
		const nextPixelsPerBeat = Math.max(
			midiConfig.zoom.minPixelsPerBeat,
			Math.min(midiConfig.zoom.maxPixelsPerBeat, currentPixelsPerBeat * factor)
		);

		if (nextPixelsPerBeat === currentPixelsPerBeat || song.ticksPerBeat <= 0) {
			return;
		}

		const mouseX = clientX - notesLeft;
		const currentLayout = new MidiLayout(currentPixelsPerBeat, song.ticksPerBeat);
		const tickAtPointer = currentLayout.pxToTick(this.$scrollLeft.get() + Math.max(0, mouseX));
		const nextLayout = new MidiLayout(nextPixelsPerBeat, song.ticksPerBeat);
		const nextScrollLeft = this.clampScrollLeft(
			song,
			Math.max(0, nextLayout.tickToPx(tickAtPointer) - mouseX),
			nextPixelsPerBeat
		);

		this.$pixelsPerBeat.set(nextPixelsPerBeat);
		this.syncScroll(song, nextScrollLeft, this.$scrollTop.get());
	}

	public getLayout(song: MidiSong): MidiLayout {
		return new MidiLayout(this.$pixelsPerBeat.get(), song.ticksPerBeat);
	}

	public getNotesWidth(song: MidiSong, pixelsPerBeat = this.$pixelsPerBeat.get()): number {
		return new MidiLayout(pixelsPerBeat, song.ticksPerBeat).notesWidth(song.totalTicks);
	}

	public getInnerWidth(song: MidiSong, pixelsPerBeat = this.$pixelsPerBeat.get()): number {
		const layout = new MidiLayout(pixelsPerBeat, song.ticksPerBeat);
		return (
			midiConfig.layout.keyboardWidth + layout.notesWidth(song.totalTicks) + layout.endPadding()
		);
	}

	public getMaxScrollLeft(song: MidiSong, pixelsPerBeat = this.$pixelsPerBeat.get()): number {
		return Math.max(0, this.getInnerWidth(song, pixelsPerBeat) - this.containerWidth);
	}

	public clampScrollLeft(
		song: MidiSong,
		scrollLeft: number,
		pixelsPerBeat = this.$pixelsPerBeat.get()
	): number {
		return Math.max(0, Math.min(this.getMaxScrollLeft(song, pixelsPerBeat), scrollLeft));
	}

	public syncScroll(song: MidiSong, scrollLeft: number, scrollTop: number): void {
		const nextScrollLeft = this.clampScrollLeft(song, scrollLeft);
		const nextScrollTop = Math.max(0, scrollTop);

		this.isProgrammaticScroll = true;
		this.$scrollLeft.set(nextScrollLeft);
		this.$scrollTop.set(nextScrollTop);

		const container = this.scrollContainerRef.current;
		if (container != null) {
			container.scrollLeft = nextScrollLeft;
			container.scrollTop = nextScrollTop;
		}

		requestAnimationFrame(() => {
			this.isProgrammaticScroll = false;
		});
	}

	// MARK: - Effects

	public unmount(): void {
		this.isProgrammaticScroll = false;
	}
}

const ReactMidiViewportCx = React.createContext<MidiViewportCx | null>(null);

export const MidiViewportCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const midiViewportCx = new MidiViewportCx();
		return [midiViewportCx, () => midiViewportCx.unmount()];
	}, []);

	// MARK: - UI

	return <ReactMidiViewportCx.Provider value={cx}>{children}</ReactMidiViewportCx.Provider>;
};

export function useMidiViewportCx(): MidiViewportCx {
	const cx = React.useContext(ReactMidiViewportCx);
	if (cx == null) {
		throw new Error('useMidiViewportCx must be used within MidiViewportCxProvider');
	}
	return cx;
}
