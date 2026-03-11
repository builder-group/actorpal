import { createState } from 'feature-state';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { MIDI_V3_MAX_PIXELS_PER_BEAT, MIDI_V3_MIN_PIXELS_PER_BEAT } from './lib';
import type { MidiV3Song, MidiV3ViewportRect } from './types';

export class MidiViewportCx {
	public readonly scrollContainerRef = React.createRef<HTMLDivElement>();
	public readonly $containerRect = createState<MidiV3ViewportRect>({
		width: 0,
		left: 0,
		height: 0
	});
	public readonly $scrollLeft = createState(0);
	public readonly $scrollTop = createState(0);
	public readonly $pixelsPerBeat = createState(64);

	public isProgrammaticScroll = false;

	public setContainerRect(rect: MidiV3ViewportRect): void {
		this.$containerRect.set(rect);
	}

	public setScrollPosition(scrollLeft: number, scrollTop: number): void {
		this.$scrollLeft.set(Math.max(0, scrollLeft));
		this.$scrollTop.set(Math.max(0, scrollTop));
	}

	public setPixelsPerBeat(value: number): void {
		this.$pixelsPerBeat.set(
			Math.max(MIDI_V3_MIN_PIXELS_PER_BEAT, Math.min(MIDI_V3_MAX_PIXELS_PER_BEAT, value))
		);
	}

	public zoomIn(): void {
		this.setPixelsPerBeat(this.$pixelsPerBeat.get() * 1.2);
	}

	public zoomOut(): void {
		this.setPixelsPerBeat(this.$pixelsPerBeat.get() / 1.2);
	}

	public zoomAtClientX(song: MidiV3Song, clientX: number, factor: number): void {
		const container = this.scrollContainerRef.current;
		const rect = this.$containerRect.get();
		const currentPixelsPerBeat = this.$pixelsPerBeat.get();
		const nextPixelsPerBeat = Math.max(
			MIDI_V3_MIN_PIXELS_PER_BEAT,
			Math.min(MIDI_V3_MAX_PIXELS_PER_BEAT, currentPixelsPerBeat * factor)
		);

		if (container == null || nextPixelsPerBeat === currentPixelsPerBeat || song.ticksPerBeat <= 0) {
			return;
		}

		const localX = clientX - rect.left;
		const beatsAtPointer =
			(this.$scrollLeft.get() + Math.max(0, localX)) / Math.max(1, currentPixelsPerBeat);
		const nextScrollLeft = Math.max(0, beatsAtPointer * nextPixelsPerBeat - localX);

		this.isProgrammaticScroll = true;
		this.$pixelsPerBeat.set(nextPixelsPerBeat);
		this.$scrollLeft.set(nextScrollLeft);
		container.scrollLeft = nextScrollLeft;

		requestAnimationFrame(() => {
			this.isProgrammaticScroll = false;
		});
	}

	public getContentWidth(song: MidiV3Song): number {
		const beats = Math.max(song.totalBeats, 8);
		return beats * this.$pixelsPerBeat.get();
	}

	public tickToPx(song: MidiV3Song, tick: number): number {
		return (tick / song.ticksPerBeat) * this.$pixelsPerBeat.get();
	}

	public pxToTick(song: MidiV3Song, px: number): number {
		return (px / this.$pixelsPerBeat.get()) * song.ticksPerBeat;
	}

	public getVisibleTickRange(song: MidiV3Song): { startTick: number; endTick: number } {
		const startTick = this.pxToTick(song, this.$scrollLeft.get());
		const endTick = this.pxToTick(song, this.$scrollLeft.get() + this.$containerRect.get().width);
		return {
			startTick: Math.max(0, startTick),
			endTick: Math.min(song.totalTicks, endTick)
		};
	}

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

	return <ReactMidiViewportCx.Provider value={cx}>{children}</ReactMidiViewportCx.Provider>;
};

export function useMidiViewportCx(): MidiViewportCx {
	const cx = React.useContext(ReactMidiViewportCx);
	if (cx == null) {
		throw new Error('useMidiViewportCx must be used within MidiViewportCxProvider');
	}
	return cx;
}
