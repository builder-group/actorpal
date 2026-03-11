// Scrollable piano roll — the core of the viewer.
//
// Zoom model (v2-style, sync bug fixed):
//   Notes use % positioning inside a flex-1 notes div. On zoom, the inner div
//   width is updated via direct DOM mutation (useListener). The flex-1 notes div
//   resizes automatically → browser repositions all % children. No per-note JS.
//
// Layout: [innerRef: flex-row, padding-right=endPadding]
//   [PianoKeys: fixed width] [notes div: flex-1] ← padding-right is end space
//
// The padding-right trick keeps end space outside the flex content area, so
// notes div width = innerRef.width - keyboardWidth (exact notesWidth). This is
// the critical invariant that keeps % notes, grid backgroundSize, and ruler marks
// all using the same pixel math.
//
// Scroll sync:
//   User scroll → $scrollLeft (Ruler listens and follows).
//   Programmatic (zoomAtPoint) → $scrollLeft → DOM via useListener.
//   isProgrammaticScroll flag breaks the feedback loop.

import { useFeatureState, useListener } from 'feature-react';
import React, { useCallback, useEffect, useRef } from 'react';
import { isBlackKey, isCNote, MidiLayout, midiConfig } from '../lib';
import { useMidiCx } from '../MidiCx';
import { useViewportCx } from '../ViewportCx';
import type { MidiTrack } from '../types';
import { PianoKeys } from './PianoKeys';

const { noteHeight, keyboardWidth, totalNotes, defaultScrollNote } = midiConfig.layout;
const TOTAL_HEIGHT = noteHeight * totalNotes;

export const PianoRoll: React.FC = () => {
	const midiCx = useMidiCx();
	const viewportCx = useViewportCx();

	const song = useFeatureState(midiCx.$song);
	const selectedTrackId = useFeatureState(midiCx.$selectedTrackId);

	const scrollRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const playheadRef = useRef<HTMLDivElement>(null);

	// MARK: - Container size tracking (needed for zoomAtPoint cursor math)

	useEffect(() => {
		const el = scrollRef.current;
		if (el == null) return;
		const observer = new ResizeObserver(() => { viewportCx.containerWidth = el.clientWidth; });
		viewportCx.containerWidth = el.clientWidth;
		observer.observe(el);
		return () => observer.disconnect();
	}, [viewportCx]);

	// MARK: - Zoom → direct DOM mutation (no React re-render for notes)
	//
	// inner div: padding-right = endPadding, width = keyboardWidth + notesWidth
	// notes div: flex-1 → auto-resizes to notesWidth when inner div width changes
	// notes (% positioned) reposition automatically when their container resizes
	// grid backgroundSize: updated independently, same ppb math → always in sync

	useListener(
		viewportCx.$pixelsPerBeat,
		({ value: ppb }) => {
			const s = midiCx.$song.get();
			if (s == null || innerRef.current == null) return;
			const layout = new MidiLayout(ppb, s.ticksPerBeat);
			innerRef.current.style.width = `${keyboardWidth + layout.notesWidth(s.totalTicks)}px`;
			innerRef.current.style.paddingRight = `${layout.endPadding()}px`;

			if (gridRef.current != null) {
				gridRef.current.style.backgroundSize = `${ppb * 4}px 100%, ${ppb}px 100%`;
			}
		},
		[midiCx, viewportCx]
	);

	// MARK: - Scroll sync: user scroll → $scrollLeft / $scrollTop

	const handleScroll = useCallback(() => {
		if (viewportCx.isProgrammaticScroll) return;
		const el = scrollRef.current;
		if (el == null) return;
		viewportCx.$scrollLeft.set(el.scrollLeft);
		viewportCx.$scrollTop.set(el.scrollTop);
	}, [viewportCx]);

	// MARK: - Scroll sync: $scrollLeft / $scrollTop → DOM (programmatic scroll)

	useListener(
		viewportCx.$scrollLeft,
		({ value }) => {
			const el = scrollRef.current;
			if (el == null || Math.abs(el.scrollLeft - value) < 1) return;
			viewportCx.isProgrammaticScroll = true;
			el.scrollLeft = value;
			requestAnimationFrame(() => { viewportCx.isProgrammaticScroll = false; });
		},
		[viewportCx]
	);

	useListener(
		viewportCx.$scrollTop,
		({ value }) => {
			const el = scrollRef.current;
			if (el == null || Math.abs(el.scrollTop - value) < 1) return;
			viewportCx.isProgrammaticScroll = true;
			el.scrollTop = value;
			requestAnimationFrame(() => { viewportCx.isProgrammaticScroll = false; });
		},
		[viewportCx]
	);

	// MARK: - Ctrl+Wheel zoom (cursor-preserving via zoomAtPoint)

	useEffect(() => {
		const el = scrollRef.current;
		if (el == null) return;
		const onWheel = (e: WheelEvent) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			const factor = e.deltaY > 0 ? 1 / midiConfig.zoom.wheelFactor : midiConfig.zoom.wheelFactor;
			viewportCx.zoomAtPoint(factor, e.clientX, el.getBoundingClientRect().left + keyboardWidth);
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	}, [viewportCx]);

	// MARK: - Playhead (direct DOM mutation — 60fps without React setState)

	useEffect(() => {
		if (song == null) return;
		const update = () => {
			const playhead = playheadRef.current;
			const container = scrollRef.current;
			const s = midiCx.$song.get();
			if (playhead == null || s == null || s.totalTicks <= 0) return;

			// % position auto-scales with zoom (same as notes)
			playhead.style.left = `${(midiCx.$playheadTick.get() / s.totalTicks) * 100}%`;

			if (!midiCx.$isPlaying.get() || container == null) return;

			// Auto-scroll to keep playhead visible during playback
			const layout = new MidiLayout(viewportCx.$pixelsPerBeat.get(), s.ticksPerBeat);
			const playheadPx = layout.tickToPx(midiCx.$playheadTick.get());
			const margin = container.clientWidth * 0.22;
			const viewRight = viewportCx.$scrollLeft.get() + container.clientWidth - keyboardWidth;

			if (playheadPx < viewportCx.$scrollLeft.get() || playheadPx > viewRight - margin) {
				const next = Math.max(0, playheadPx - margin);
				viewportCx.isProgrammaticScroll = true;
				container.scrollLeft = next;
				viewportCx.$scrollLeft.set(next);
				requestAnimationFrame(() => { viewportCx.isProgrammaticScroll = false; });
			}
		};
		update();
		return midiCx.$playheadTick.listen(update);
	}, [midiCx, viewportCx, song]);

	// MARK: - Initial scroll to middle C area on song load

	useEffect(() => {
		if (song == null) return;
		const el = scrollRef.current;
		if (el == null) return;
		const top = Math.max(0, (totalNotes - 1 - defaultScrollNote) * noteHeight - el.clientHeight / 2);
		el.scrollTop = top;
		viewportCx.$scrollTop.set(top);
	}, [viewportCx, song]);

	// MARK: - UI

	if (song == null) return null;

	const layout = new MidiLayout(viewportCx.$pixelsPerBeat.get(), song.ticksPerBeat);
	const accentColor = song.tracks.find((t) => t.id === selectedTrackId)?.color;

	return (
		<div ref={scrollRef} className="min-h-0 flex-1 overflow-auto" onScroll={handleScroll}>
			{/*
			 * Virtual container — drives scroll range.
			 * padding-right = end breathing space (does NOT affect flex child widths).
			 * On zoom: we update width + paddingRight directly via innerRef.
			 * Notes div is flex-1 → auto-resizes to exact notesWidth. No stale values.
			 */}
			<div
				ref={innerRef}
				className="flex"
				style={{
					width: keyboardWidth + layout.notesWidth(song.totalTicks),
					paddingRight: layout.endPadding(),
					height: TOTAL_HEIGHT
				}}
			>
				<PianoKeys accentColor={accentColor} />

				{/* Notes area — flex-1 = notesWidth exactly. % notes are in sync with grid. */}
				<div className="relative flex-1">
					<LaneBg />
					<GridLines ref={gridRef} ppb={layout.pixelsPerBeat} />

					{/* Unselected tracks behind, selected on top */}
					{song.tracks
						.filter((t) => t.id !== selectedTrackId)
						.map((t) => (
							<TrackNotes key={t.id} track={t} totalTicks={song.totalTicks} isSelected={false} />
						))}
					{song.tracks
						.filter((t) => t.id === selectedTrackId)
						.map((t) => (
							<TrackNotes key={t.id} track={t} totalTicks={song.totalTicks} isSelected={true} />
						))}

					<div
						ref={playheadRef}
						className="pointer-events-none absolute top-0 z-20 h-full w-0.5"
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

// MARK: - Lane background (128 static rows, never re-renders)

const LaneBg: React.FC = React.memo(() => (
	<div className="absolute inset-0">
		{Array.from({ length: totalNotes }, (_, i) => {
			const note = totalNotes - 1 - i;
			return (
				<div
					key={note}
					style={{
						height: noteHeight,
						background: isCNote(note)
							? 'color-mix(in srgb, #eef4ff 60%, white)'
							: isBlackKey(note)
								? '#f7f7f8'
								: 'white',
						borderBottom: `1px solid ${isCNote(note) ? 'var(--color-base-200)' : 'color-mix(in srgb, var(--color-base-200) 45%, transparent)'}`
					}}
				/>
			);
		})}
	</div>
));
LaneBg.displayName = 'LaneBg';

// MARK: - Grid lines (CSS repeat — updated via DOM ref on zoom, never re-renders)

const GridLines = React.forwardRef<HTMLDivElement, { ppb: number }>(({ ppb }, ref) => (
	<div
		ref={ref}
		className="pointer-events-none absolute inset-0"
		style={{
			backgroundImage: [
				'linear-gradient(to right, var(--color-base-200) 1px, transparent 1px)',
				'linear-gradient(to right, color-mix(in srgb, var(--color-base-200) 50%, transparent) 1px, transparent 1px)'
			].join(', '),
			backgroundSize: `${ppb * 4}px 100%, ${ppb}px 100%`
		}}
	/>
));
GridLines.displayName = 'GridLines';

// MARK: - Track notes (% positioned — auto-repositions when notes div resizes)

const TrackNotes: React.FC<TTrackNotesProps> = React.memo(({ track, totalTicks, isSelected }) => (
	<div className="pointer-events-none absolute inset-0" style={{ zIndex: isSelected ? 2 : 1 }}>
		{track.notes.map((note) => (
			<div
				key={note.id}
				className="absolute"
				style={{
					left: `${(note.tick / Math.max(1, totalTicks)) * 100}%`,
					width: `${(note.durationTicks / Math.max(1, totalTicks)) * 100}%`,
					minWidth: 2,
					top: (totalNotes - 1 - note.noteNumber) * noteHeight + 2,
					height: noteHeight - 4,
					borderRadius: 3,
					background: track.color,
					opacity: isSelected
						? midiConfig.colors.noteSelectedOpacity
						: midiConfig.colors.noteGhostOpacity,
					boxShadow: isSelected
						? `inset 0 0 0 1px color-mix(in srgb, ${track.color} 65%, white)`
						: undefined
				}}
			/>
		))}
	</div>
));
TrackNotes.displayName = 'TrackNotes';

// MARK: - Types

interface TTrackNotesProps {
	track: MidiTrack;
	totalTicks: number;
	isSelected: boolean;
}
