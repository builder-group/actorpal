// Measure/beat ruler above the note grid.
//
// Same zoom model as NoteGrid: beat markers use % positioning inside a virtual-width
// container. On zoom, the container width updates via useListener and markers reposition
// automatically. scrollLeft is synced programmatically from TimelineCx.

import { useFeatureState, useListener } from 'feature-react';
import React, { useCallback, useMemo, useRef } from 'react';
import { NoteTransform, PIANO_WIDTH, RULER_HEIGHT } from '../lib';
import { useMidiCx } from '../MidiCx';
import { useTimelineCx } from '../TimelineCx';

const BEATS_PER_MEASURE = 4;

export const NoteRuler: React.FC<TNoteRulerProps> = (props) => {
	const { onSeek } = props;

	const midiCx = useMidiCx();
	const timelineCx = useTimelineCx();
	const song = useFeatureState(midiCx.$song);
	// Re-render on zoom so label density adapts (ruler is tiny, this is fine)
	const pixelsPerBeat = useFeatureState(timelineCx.$pixelsPerBeat);

	const scrollRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);

	// MARK: - Zoom (container width update, markers reposition via %)

	useListener(
		timelineCx.$pixelsPerBeat,
		() => {
			const s = midiCx.$song.get();
			if (s == null || innerRef.current == null) return;
			const t = new NoteTransform(timelineCx.$pixelsPerBeat.get(), s.ticksPerBeat);
			innerRef.current.style.width = `${t.totalWidth(s.totalTicks)}px`;
		},
		[midiCx, timelineCx]
	);

	// MARK: - Scroll sync (NoteGrid drives $scrollLeft, ruler follows)

	useListener(
		timelineCx.$scrollLeft,
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
			const t = new NoteTransform(timelineCx.$pixelsPerBeat.get(), s.ticksPerBeat);
			const x =
				e.clientX - e.currentTarget.getBoundingClientRect().left + timelineCx.$scrollLeft.get();
			onSeek?.(t.toTick(x));
		},
		[midiCx, timelineCx, onSeek]
	);

	// MARK: - Beat markers

	const beats = useMemo(() => {
		if (song == null) return [];
		const totalBeats = Math.ceil(song.totalTicks / song.ticksPerBeat);
		return Array.from({ length: totalBeats + 1 }, (_, i) => ({
			beat: i,
			isMeasure: i % BEATS_PER_MEASURE === 0,
			label:
				i % BEATS_PER_MEASURE === 0 ? String(Math.floor(i / BEATS_PER_MEASURE) + 1) : String(i + 1),
			pct: `${((i * song.ticksPerBeat) / song.totalTicks) * 100}%`
		}));
	}, [song]);

	if (song == null) return null;

	const t = new NoteTransform(pixelsPerBeat, song.ticksPerBeat);
	const showBeatLabels = pixelsPerBeat >= 60;

	return (
		<div className="flex shrink-0" style={{ borderBottom: '1px solid var(--color-base-200)' }}>
			{/* Corner spacer — above piano keys */}
			<div
				className="shrink-0"
				style={{
					width: PIANO_WIDTH,
					height: RULER_HEIGHT,
					background: 'var(--color-base-0)',
					borderRight: '1px solid var(--color-base-200)'
				}}
			/>

			{/* Ruler — overflow hidden, scrollLeft synced with NoteGrid */}
			<div
				ref={scrollRef}
				style={{ flex: 1, height: RULER_HEIGHT, overflow: 'hidden', cursor: 'pointer' }}
				onClick={handleClick}
				title="Click to seek"
			>
				<div
					ref={innerRef}
					className="relative"
					style={{
						width: t.totalWidth(song.totalTicks),
						height: RULER_HEIGHT,
						background: 'var(--color-base-0)'
					}}
				>
					{beats.map(({ beat, isMeasure, label, pct }) => {
						if (!isMeasure && !showBeatLabels) return null;
						return (
							<div key={beat} className="absolute top-0 bottom-0" style={{ left: pct }}>
								{/* Tick mark */}
								<div
									className="absolute bottom-0 w-px"
									style={{
										height: isMeasure ? 14 : 6,
										background: isMeasure ? 'var(--color-base-300)' : 'var(--color-base-200)'
									}}
								/>
								{/* Label */}
								{(isMeasure || showBeatLabels) && (
									<span
										className="absolute text-[9px] select-none"
										style={{
											top: 5,
											left: 3,
											color: isMeasure ? 'var(--color-base-500)' : 'var(--color-base-300)',
											fontWeight: isMeasure ? 700 : 400
										}}
									>
										{label}
									</span>
								)}
							</div>
						);
					})}
					{/* Bottom border line */}
					<div
						className="absolute right-0 bottom-0 left-0 h-px"
						style={{ background: 'var(--color-base-200)' }}
					/>
				</div>
			</div>
		</div>
	);
};

// MARK: - Types

interface TNoteRulerProps {
	onSeek?: (tick: number) => void;
}
