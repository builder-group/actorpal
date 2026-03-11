// Scrollable piano roll.
//
// Zoom model (same as v1): notes use percentage positioning so when the virtual
// container width changes, the browser repositions everything automatically —
// no canvas redraws, no per-note JS updates.
//
// Scroll sync (improved over v1):
// - NoteGrid drives $scrollLeft on user scroll (if not a programmatic scroll).
// - $scrollLeft drives NoteGrid DOM on programmatic scroll (e.g. zoomAtPoint).
// - isProgrammaticScroll flag breaks the feedback loop between the two.
//
// Zoom (improved over v1):
// - Ctrl+Wheel calls zoomAtPoint() so the tick under the cursor stays fixed.
// - containerWidth is tracked via ResizeObserver for accurate zoom math.

import { useFeatureState, useListener } from 'feature-react';
import React, { useCallback, useEffect, useRef } from 'react';
import {
	DEFAULT_SCROLL_NOTE,
	isBlackKey,
	isCNote,
	NOTE_HEIGHT,
	NoteTransform,
	PIANO_WIDTH,
	TOTAL_CANVAS_HEIGHT,
	TOTAL_NOTES
} from '../lib';
import { useMidiCx } from '../MidiCx';
import { useTimelineCx } from '../TimelineCx';
import type { TMidiTrack } from '../types';
import { PianoKeys } from './PianoKeys';

export const NoteGrid: React.FC = () => {
	const midiCx = useMidiCx();
	const timelineCx = useTimelineCx();
	const song = useFeatureState(midiCx.$song);
	const selectedTrackId = useFeatureState(midiCx.$selectedTrackId);

	const scrollRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const playheadRef = useRef<HTMLDivElement>(null);

	// MARK: - Container width tracking (needed for correct zoomAtPoint math)

	useEffect(() => {
		const el = scrollRef.current;
		if (el == null) return;
		const observer = new ResizeObserver(() => {
			timelineCx.containerWidth = el.clientWidth;
		});
		timelineCx.containerWidth = el.clientWidth;
		observer.observe(el);
		return () => observer.disconnect();
	}, [timelineCx]);

	// MARK: - Zoom → update inner div width (notes reposition via %)

	useListener(
		timelineCx.$pixelsPerBeat,
		() => {
			const s = midiCx.$song.get();
			if (s == null || innerRef.current == null) return;
			const t = new NoteTransform(timelineCx.$pixelsPerBeat.get(), s.ticksPerBeat);
			innerRef.current.style.width = `${t.totalWidth(s.totalTicks) + PIANO_WIDTH}px`;
		},
		[midiCx, timelineCx]
	);

	// MARK: - Scroll sync: NoteGrid drives $scrollLeft on user scroll

	const handleScroll = useCallback(() => {
		if (timelineCx.isProgrammaticScroll) return;
		const el = scrollRef.current;
		if (el == null) return;
		timelineCx.$scrollLeft.set(el.scrollLeft);
		timelineCx.$scrollTop.set(el.scrollTop);
	}, [timelineCx]);

	// MARK: - Scroll sync: $scrollLeft drives NoteGrid on programmatic scroll
	//         (e.g. zoomAtPoint updates $scrollLeft → NoteGrid must follow)

	useListener(
		timelineCx.$scrollLeft,
		({ value }) => {
			const el = scrollRef.current;
			if (el == null || Math.abs(el.scrollLeft - value) < 1) return;
			timelineCx.isProgrammaticScroll = true;
			el.scrollLeft = value;
			requestAnimationFrame(() => {
				timelineCx.isProgrammaticScroll = false;
			});
		},
		[timelineCx]
	);

	// MARK: - Ctrl+Wheel zoom (preserves the tick under the cursor)

	useEffect(() => {
		const el = scrollRef.current;
		if (el == null) return;
		const onWheel = (e: WheelEvent) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			const rect = el.getBoundingClientRect();
			const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
			// Pass contentLeft = containerLeft + PIANO_WIDTH so zoomAtPoint
			// correctly computes the tick under the cursor (excluding piano keys).
			timelineCx.zoomAtPoint(factor, e.clientX, rect.left + PIANO_WIDTH);
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	}, [timelineCx]);

	// MARK: - Playhead (direct DOM mutation, % position auto-scales with zoom)

	useEffect(() => {
		if (song == null) return;

		const update = () => {
			const el = playheadRef.current;
			const scrollEl = scrollRef.current;
			const s = midiCx.$song.get();
			if (el == null || s == null) return;

			const pct = midiCx.$playheadTick.get() / s.totalTicks;
			el.style.left = `${pct * 100}%`;

			if (midiCx.$isPlaying.get() && scrollEl != null) {
				const notesWidth = scrollEl.scrollWidth - PIANO_WIDTH;
				const playheadX = PIANO_WIDTH + pct * notesWidth;
				const viewportX = playheadX - scrollEl.scrollLeft;
				const margin = scrollEl.clientWidth * 0.25;
				if (viewportX < PIANO_WIDTH || viewportX > scrollEl.clientWidth - margin) {
					scrollEl.scrollLeft = Math.max(0, playheadX - PIANO_WIDTH - margin);
				}
			}
		};

		update();
		return midiCx.$playheadTick.listen(update);
	}, [midiCx, song]);

	// MARK: - Initial scroll to middle C area

	useEffect(() => {
		if (song == null) return;
		const el = scrollRef.current;
		if (el == null) return;
		el.scrollTop = Math.max(0, (127 - DEFAULT_SCROLL_NOTE) * NOTE_HEIGHT - el.clientHeight / 2);
	}, [song]);

	// MARK: - UI

	if (song == null) return null;

	const accentColor = song.tracks.find((t) => t.id === selectedTrackId)?.color;
	const t = new NoteTransform(timelineCx.$pixelsPerBeat.get(), song.ticksPerBeat);

	return (
		<div ref={scrollRef} className="min-h-0 flex-1 overflow-auto" onScroll={handleScroll}>
			{/* Virtual container: defines scroll range, notes use % so they zoom with it */}
			<div
				ref={innerRef}
				className="relative flex"
				style={{ width: t.totalWidth(song.totalTicks) + PIANO_WIDTH, height: TOTAL_CANVAS_HEIGHT }}
			>
				<div className="sticky left-0 z-2 shrink-0">
					<PianoKeys accentColor={accentColor} />
				</div>

				<div className="relative flex-1">
					<LaneBg />
					<GridLines />

					{/* Unselected tracks behind, selected on top */}
					{song.tracks
						.filter((tr) => tr.id !== selectedTrackId)
						.map((track) => (
							<TrackNotes
								key={track.id}
								track={track}
								isSelected={false}
								totalTicks={song.totalTicks}
							/>
						))}
					{song.tracks
						.filter((tr) => tr.id === selectedTrackId)
						.map((track) => (
							<TrackNotes
								key={track.id}
								track={track}
								isSelected={true}
								totalTicks={song.totalTicks}
							/>
						))}

					<div
						ref={playheadRef}
						className="pointer-events-none absolute top-0 z-10 h-full w-0.5"
						style={{
							left: 0,
							background: 'var(--color-error)',
							boxShadow: '0 0 8px var(--color-error)'
						}}
					/>
				</div>
			</div>
		</div>
	);
};

// MARK: - Lane backgrounds (128 static rows, never re-renders)

const LaneBg: React.FC = React.memo(() => (
	<div className="absolute inset-0">
		{Array.from({ length: TOTAL_NOTES }, (_, i) => {
			const note = TOTAL_NOTES - 1 - i;
			return (
				<div
					key={note}
					style={{
						height: NOTE_HEIGHT,
						background: isCNote(note)
							? 'var(--color-base-100)'
							: isBlackKey(note)
								? 'var(--color-base-0)'
								: 'var(--color-base-50)',
						borderBottom: isCNote(note) ? '1px solid var(--color-base-200)' : undefined
					}}
				/>
			);
		})}
	</div>
));
LaneBg.displayName = 'LaneBg';

// MARK: - Grid lines (CSS background-size, updated directly on zoom — no re-renders)

const GridLines: React.FC = () => {
	const timelineCx = useTimelineCx();
	const ref = useRef<HTMLDivElement>(null);
	const ppb = timelineCx.$pixelsPerBeat.get();

	useListener(
		timelineCx.$pixelsPerBeat,
		({ value }) => {
			if (ref.current != null) {
				ref.current.style.backgroundSize = `${value * 4}px 100%, ${value}px 100%`;
			}
		},
		[]
	);

	return (
		<div
			ref={ref}
			className="pointer-events-none absolute inset-0"
			style={{
				backgroundImage: [
					'linear-gradient(to right, var(--color-base-200) 1px, transparent 1px)',
					'linear-gradient(to right, var(--color-base-100) 1px, transparent 1px)'
				].join(', '),
				backgroundSize: `${ppb * 4}px 100%, ${ppb}px 100%`
			}}
		/>
	);
};

// MARK: - Track notes (% positioned — auto-scales when container width changes)

const TrackNotes: React.FC<TTrackNotesProps> = React.memo(({ track, isSelected, totalTicks }) => (
	<div className="pointer-events-none absolute inset-0" style={{ zIndex: isSelected ? 2 : 1 }}>
		{track.notes.map((note) => (
			<div
				key={note.id}
				className="absolute"
				style={{
					left: `${(note.tick / totalTicks) * 100}%`,
					top: (127 - note.noteNumber) * NOTE_HEIGHT + 1,
					width: `${(note.duration / totalTicks) * 100}%`,
					minWidth: 2,
					height: NOTE_HEIGHT - 2,
					borderRadius: 1,
					background: track.color,
					opacity: isSelected ? 0.9 : 0.15
				}}
			/>
		))}
	</div>
));
TrackNotes.displayName = 'TrackNotes';

// MARK: - Types

interface TTrackNotesProps {
	track: TMidiTrack;
	isSelected: boolean;
	totalTicks: number;
}
