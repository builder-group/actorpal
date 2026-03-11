// Time ruler — beat and measure markers above the note grid.
//
// Sync guarantee:
//   Marks use absolute px: left = beat * pixelsPerBeat.
//   This is identical to the grid's backgroundSize repeat interval → always aligned.
//   Inner div width = notesWidth (content) + endPadding (padding-right).
//   Mirrors PianoRoll exactly so scrollLeft sync keeps them pixel-perfect.
//
// Scroll: driven by $scrollLeft (set by PianoRoll on user scroll). Read-only here.
// Zoom: re-renders via useFeatureState($pixelsPerBeat) → marks repositioned in React.

import { useFeatureState, useListener } from 'feature-react';
import React, { useCallback, useRef } from 'react';
import { MidiLayout, midiConfig } from '../lib';
import { useMidiCx } from '../MidiCx';
import { useViewportCx } from '../ViewportCx';

const { keyboardWidth, rulerHeight } = midiConfig.layout;
const BEATS_PER_MEASURE = 4;

export const Ruler: React.FC<TRulerProps> = ({ onSeek }) => {
	const midiCx = useMidiCx();
	const viewportCx = useViewportCx();

	const song = useFeatureState(midiCx.$song);
	// Re-render on zoom → mark positions (beat * ppb) update automatically.
	const pixelsPerBeat = useFeatureState(viewportCx.$pixelsPerBeat);

	const scrollRef = useRef<HTMLDivElement>(null);

	// MARK: - Scroll sync: $scrollLeft → ruler DOM (ruler never fires scroll events)

	useListener(
		viewportCx.$scrollLeft,
		({ value }) => {
			if (scrollRef.current != null) scrollRef.current.scrollLeft = value;
		},
		[]
	);

	// MARK: - Click to seek

	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const s = midiCx.$song.get();
			if (s == null) return;
			const layout = new MidiLayout(viewportCx.$pixelsPerBeat.get(), s.ticksPerBeat);
			const x = e.clientX - e.currentTarget.getBoundingClientRect().left + viewportCx.$scrollLeft.get();
			onSeek?.(layout.pxToTick(x));
		},
		[midiCx, viewportCx, onSeek]
	);

	// MARK: - UI

	if (song == null) return null;

	const layout = new MidiLayout(pixelsPerBeat, song.ticksPerBeat);
	const notesWidth = layout.notesWidth(song.totalTicks);
	const totalBeats = Math.ceil(song.totalTicks / song.ticksPerBeat);
	const showBeatLabels = pixelsPerBeat >= 56;

	return (
		<div className="flex shrink-0" style={{ borderBottom: '1px solid var(--color-base-200)', height: rulerHeight }}>
			{/* Corner spacer — sits above the piano keyboard */}
			<div
				className="shrink-0 border-r"
				style={{
					width: keyboardWidth,
					background: 'var(--color-base-0)',
					borderColor: 'var(--color-base-200)'
				}}
			/>

			{/* Scrollable ruler — overflow:hidden, scrollLeft driven by JS */}
			<div
				ref={scrollRef}
				className="flex-1 cursor-pointer overflow-hidden"
				onClick={handleClick}
				title="Click to seek"
			>
				{/*
				 * Same layout contract as PianoRoll inner div:
				 * content width = notesWidth, padding-right = endPadding.
				 * Mark positions (beat * ppb) are relative to content width. ✓
				 */}
				<div
					className="relative h-full"
					style={{
						width: notesWidth,
						paddingRight: layout.endPadding(),
						background: 'var(--color-base-0)'
					}}
				>
					{Array.from({ length: totalBeats + 1 }, (_, beat) => {
						const isMeasure = beat % BEATS_PER_MEASURE === 0;
						if (!isMeasure && !showBeatLabels) return null;

						// Absolute px — same formula as grid backgroundSize repeat ✓
						const x = beat * pixelsPerBeat;

						return (
							<div key={beat} className="absolute inset-y-0" style={{ left: x }}>
								<div
									className="absolute bottom-0 w-px"
									style={{
										height: isMeasure ? 14 : 6,
										background: isMeasure ? 'var(--color-base-300)' : 'var(--color-base-200)'
									}}
								/>
								<span
									className="absolute select-none text-[9px]"
									style={{
										top: 5,
										left: 3,
										color: isMeasure ? 'var(--color-base-500)' : 'var(--color-base-300)',
										fontWeight: isMeasure ? 700 : 400
									}}
								>
									{isMeasure
										? String(Math.floor(beat / BEATS_PER_MEASURE) + 1)
										: String(beat + 1)}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

// MARK: - Types

interface TRulerProps {
	onSeek?: (tick: number) => void;
}
