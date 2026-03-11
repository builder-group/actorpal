// Scrollable piano roll: sticky piano keys on the left, viewport-sized canvas on the right.
//
// Performance model:
//   - Canvas is viewport-sized, not full-song-sized.
//   - On zoom: update virtual spacer width (CSS, instant) + schedule one canvas redraw.
//   - On scroll: schedule one canvas redraw; note x positions are offset by scrollLeft.
//   - All canvas work goes through scheduleDraw() → rAF batching.
//   - Playhead uses direct DOM mutation; no React re-renders during playback.

import React, { useCallback, useEffect, useRef } from 'react';
import { useFeatureState, useListener } from 'feature-react';
import {
	DEFAULT_SCROLL_NOTE,
	NOTE_HEIGHT,
	NoteTransform,
	PIANO_WIDTH,
	TOTAL_CANVAS_HEIGHT,
	isBlackKey,
	isCNote,
	noteName,
} from '../lib';
import { useMidiCx } from '../MidiCx';
import { useTimelineCx } from '../TimelineCx';
import { PianoKeys } from './PianoKeys';
import type { MidiSong, MidiTrack } from '../types';

// Canvas colors — resolved from dark-mode theme values in styles.css.
// Canvas 2D API does not support CSS variables, so we pre-resolve them here.
const COLORS = {
	bgWhite: '#18181b',   // --color-base-50
	bgBlack: '#09090b',   // --color-base-0
	bgC: '#27272a',       // --color-base-100
	gridBeat: '#27272a',  // --color-base-100
	gridMeasure: '#3f3f46', // --color-base-200
	playhead: '#ef4444',  // --color-error
} as const;

export const NoteGrid: React.FC = () => {
	const midiCx = useMidiCx();
	const timelineCx = useTimelineCx();
	const song = useFeatureState(midiCx.$song);
	const selectedTrackId = useFeatureState(midiCx.$selectedTrackId);

	const scrollRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const playheadRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null); // virtual spacer (defines scroll range)
	const notesRef = useRef<HTMLDivElement>(null); // notes column (canvas + playhead)

	// Stable refs — read inside callbacks without adding to dep arrays
	const songRef = useRef<MidiSong | null>(null);
	const selectedTrackIdRef = useRef<number | null>(null);
	songRef.current = song;
	selectedTrackIdRef.current = selectedTrackId;

	// rAF batching — coalesces rapid zoom/scroll events into one draw per frame
	const rafRef = useRef<number | null>(null);

	// MARK: - Transform (reads live values, no React state dep)

	const buildTransform = useCallback((): NoteTransform | null => {
		const s = songRef.current;
		if (s == null) return null;
		return new NoteTransform(timelineCx.$pixelsPerBeat.get(), s.ticksPerBeat);
	}, [timelineCx]);

	// MARK: - Draw (viewport canvas — all x coords offset by scrollLeft)

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		const s = songRef.current;
		const t = buildTransform();
		if (canvas == null || s == null || t == null) return;

		const ctx = canvas.getContext('2d');
		if (ctx == null) return;

		const scrollLeft = timelineCx.$scrollLeft.get();
		const w = canvas.width;
		const h = canvas.height;

		// Lane backgrounds (full viewport width regardless of scroll)
		for (let note = 0; note <= 127; note++) {
			const y = (127 - note) * NOTE_HEIGHT;
			ctx.fillStyle = isCNote(note) ? COLORS.bgC : isBlackKey(note) ? COLORS.bgBlack : COLORS.bgWhite;
			ctx.fillRect(0, y, w, NOTE_HEIGHT);
			if (isCNote(note)) {
				ctx.fillStyle = COLORS.gridMeasure;
				ctx.fillRect(0, y + NOTE_HEIGHT - 1, w, 1);
			}
		}

		// Vertical grid lines (offset by scrollLeft so they scroll with content)
		const beatsPerMeasure = 4;
		const totalBeats = Math.ceil(s.totalTicks / s.ticksPerBeat) + beatsPerMeasure;
		for (let beat = 0; beat <= totalBeats; beat++) {
			const x = Math.round(t.getX(beat * s.ticksPerBeat)) - scrollLeft;
			if (x > w) break;
			if (x < 0) continue;
			ctx.fillStyle = beat % beatsPerMeasure === 0 ? COLORS.gridMeasure : COLORS.gridBeat;
			ctx.fillRect(x, 0, 1, h);
		}

		// Notes — unselected behind, selected on top
		const selId = selectedTrackIdRef.current;
		for (const track of s.tracks) {
			if (track.id !== selId) drawTrackNotes(ctx, track, t, false, scrollLeft);
		}
		const sel = s.tracks.find((tr) => tr.id === selId);
		if (sel != null) drawTrackNotes(ctx, sel, t, true, scrollLeft);
	}, [buildTransform, timelineCx]);

	const scheduleDraw = useCallback(() => {
		if (rafRef.current != null) return;
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			draw();
		});
	}, [draw]);

	// MARK: - Canvas setup (only resizes when viewport dimensions change)

	const setupCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const scrollEl = scrollRef.current;
		if (canvas == null || scrollEl == null) return;

		const viewW = Math.max(1, scrollEl.clientWidth - PIANO_WIDTH);
		if (canvas.width !== viewW || canvas.height !== TOTAL_CANVAS_HEIGHT) {
			canvas.width = viewW;
			canvas.height = TOTAL_CANVAS_HEIGHT;
		}
		draw();
	}, [draw]);

	// MARK: - Update virtual spacer widths (CSS only — no canvas involved)

	const updateSpacerWidths = useCallback(() => {
		const s = songRef.current;
		const t = buildTransform();
		if (s == null || t == null) return;
		const totalW = t.totalWidth(s.totalTicks);
		if (innerRef.current != null) innerRef.current.style.width = `${totalW + PIANO_WIDTH}px`;
		if (notesRef.current != null) notesRef.current.style.width = `${totalW}px`;
	}, [buildTransform]);

	// MARK: - Effects

	// Song / track selection: re-render is appropriate (structure changes)
	useEffect(() => {
		updateSpacerWidths();
		setupCanvas();
	}, [song, selectedTrackId, updateSpacerWidths, setupCanvas]);

	// Zoom: update spacer widths (CSS, instant) + batch canvas redraw
	useListener(timelineCx.$pixelsPerBeat, () => {
		updateSpacerWidths();
		scheduleDraw();
	}, [updateSpacerWidths, scheduleDraw]);

	// Viewport resize: resize canvas + redraw
	useEffect(() => {
		const el = scrollRef.current;
		if (el == null) return;
		const observer = new ResizeObserver(() => setupCanvas());
		observer.observe(el);
		return () => observer.disconnect();
	}, [setupCanvas]);

	// MARK: - Initial scroll to middle C area

	useEffect(() => {
		if (song == null) return;
		const el = scrollRef.current;
		if (el == null) return;
		const targetY = (127 - DEFAULT_SCROLL_NOTE) * NOTE_HEIGHT - el.clientHeight / 2;
		el.scrollTop = Math.max(0, targetY);
	}, [song]);

	// MARK: - Scroll handling

	const handleScroll = useCallback(() => {
		const el = scrollRef.current;
		if (el == null) return;
		timelineCx.$scrollLeft.set(el.scrollLeft);
		timelineCx.$scrollTop.set(el.scrollTop);
		scheduleDraw();
	}, [timelineCx, scheduleDraw]);

	// MARK: - Ctrl+Wheel zoom

	useEffect(() => {
		const el = scrollRef.current;
		if (el == null) return;
		const onWheel = (e: WheelEvent) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			timelineCx.setZoom(timelineCx.$pixelsPerBeat.get() * (e.deltaY > 0 ? 1 / 1.15 : 1.15));
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	}, [timelineCx]);

	// MARK: - Playhead (direct DOM mutation)

	useEffect(() => {
		const el = playheadRef.current;
		if (el == null) return;

		const update = () => {
			const t = buildTransform();
			if (t == null) return;
			el.style.left = `${t.getX(midiCx.$playheadTick.get())}px`;

			if (midiCx.$isPlaying.get()) {
				const scrollEl = scrollRef.current;
				if (scrollEl != null) {
					const x = t.getX(midiCx.$playheadTick.get());
					const margin = scrollEl.clientWidth * 0.25;
					if (x < scrollEl.scrollLeft || x > scrollEl.scrollLeft + scrollEl.clientWidth - margin) {
						scrollEl.scrollLeft = Math.max(0, x - margin);
					}
				}
			}
		};

		update();
		const unlisten = midiCx.$playheadTick.listen(update);
		return () => unlisten();
	}, [midiCx, buildTransform]);

	// MARK: - UI

	if (song == null) return null;

	const accentColor = song.tracks.find((t) => t.id === selectedTrackId)?.color;
	const initialTotalW = buildTransform()?.totalWidth(song.totalTicks) ?? 1200;

	return (
		<div
			ref={scrollRef}
			onScroll={handleScroll}
			className="flex-1 overflow-auto min-h-0"
		>
			{/* Virtual spacer: defines the full scrollable area */}
			<div
				ref={innerRef}
				style={{ display: 'flex', width: initialTotalW + PIANO_WIDTH, height: TOTAL_CANVAS_HEIGHT }}
			>
				{/* Piano keys — sticky when scrolling horizontally */}
				<div className="sticky left-0 z-2 shrink-0">
					<PianoKeys accentColor={accentColor} />
				</div>

				{/* Notes column: virtual width for scroll range */}
				<div
					ref={notesRef}
					style={{ position: 'relative', width: initialTotalW, height: TOTAL_CANVAS_HEIGHT, flexShrink: 0 }}
				>
					{/* Viewport canvas — sticky so it stays visible while the virtual column scrolls */}
					<canvas
						ref={canvasRef}
						style={{ display: 'block', position: 'sticky', left: 0, zIndex: 1 }}
					/>

					{/* Playhead — absolute in virtual space */}
					<div
						ref={playheadRef}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: 2,
							height: '100%',
							background: COLORS.playhead,
							boxShadow: `0 0 8px ${COLORS.playhead}88`,
							zIndex: 3,
							pointerEvents: 'none',
						}}
					/>
				</div>
			</div>
		</div>
	);
};

// MARK: - Canvas drawing helpers

function drawTrackNotes(
	ctx: CanvasRenderingContext2D,
	track: MidiTrack,
	t: NoteTransform,
	isSelected: boolean,
	scrollLeft: number,
): void {
	const [r, g, b] = hexToRgb(track.color);
	const alpha = isSelected ? 0.92 : 0.18;
	const fill = `rgba(${r},${g},${b},${alpha})`;
	const highlight = `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 50)},${alpha})`;

	for (const note of track.notes) {
		const x = Math.round(t.getX(note.tick)) - scrollLeft;
		const y = (127 - note.noteNumber) * NOTE_HEIGHT;
		const w = Math.max(Math.round(t.getWidth(note.duration)) - 1, 2);
		const h = NOTE_HEIGHT - 1;

		// Viewport culling
		if (x + w < 0 || x > ctx.canvas.width) continue;
		if (y + h < 0 || y > ctx.canvas.height) continue;

		ctx.fillStyle = fill;
		ctx.fillRect(x + 1, y + 1, w, h);

		if (isSelected) {
			ctx.fillStyle = highlight;
			ctx.fillRect(x + 1, y + 1, 2, h);
		}

		if (isSelected && w > 28) {
			ctx.fillStyle = 'rgba(255,255,255,0.8)';
			ctx.font = 'bold 8px system-ui, sans-serif';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			ctx.fillText(noteName(note.noteNumber), x + 5, y + NOTE_HEIGHT / 2);
		}
	}
}

function hexToRgb(hex: string): [number, number, number] {
	return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
