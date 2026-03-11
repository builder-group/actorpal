// Measure/beat ruler above the note grid.
// Viewport-sized canvas; beat positions offset by scrollLeft.

import React, { useCallback, useEffect, useRef } from 'react';
import { useFeatureState, useListener } from 'feature-react';
import { NoteTransform, PIANO_WIDTH, RULER_HEIGHT } from '../lib';
import { useMidiCx } from '../MidiCx';
import { useTimelineCx } from '../TimelineCx';
import type { MidiSong } from '../types';

// Canvas colors — resolved from dark-mode theme values in styles.css.
const COLORS = {
	bg: '#09090b',          // --color-base-0
	lineBeat: '#27272a',    // --color-base-100
	lineMeasure: '#3f3f46', // --color-base-200
	textDim: '#52525b',     // --color-base-300
	textBright: '#71717a',  // --color-base-400
} as const;

export const NoteRuler: React.FC<TNoteRulerProps> = (props) => {
	const { onSeek } = props;

	const midiCx = useMidiCx();
	const timelineCx = useTimelineCx();
	const song = useFeatureState(midiCx.$song);

	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const songRef = useRef<MidiSong | null>(null);
	songRef.current = song;

	const rafRef = useRef<number | null>(null);

	// MARK: - Draw (viewport canvas, offset by scrollLeft)

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		const s = songRef.current;
		if (canvas == null || s == null) return;

		const pixelsPerBeat = timelineCx.$pixelsPerBeat.get();
		const scrollLeft = timelineCx.$scrollLeft.get();
		const t = new NoteTransform(pixelsPerBeat, s.ticksPerBeat);
		const w = canvas.width;

		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = COLORS.bg;
		ctx.fillRect(0, 0, w, RULER_HEIGHT);

		const beatsPerMeasure = 4;
		const totalBeats = Math.ceil(s.totalTicks / s.ticksPerBeat) + beatsPerMeasure;

		for (let beat = 0; beat <= totalBeats; beat++) {
			const x = Math.round(t.getX(beat * s.ticksPerBeat)) - scrollLeft;
			if (x > w) break;
			if (x < 0) continue;

			const isMeasure = beat % beatsPerMeasure === 0;
			ctx.fillStyle = isMeasure ? COLORS.lineMeasure : COLORS.lineBeat;
			ctx.fillRect(x, isMeasure ? RULER_HEIGHT - 14 : RULER_HEIGHT - 6, 1, isMeasure ? 14 : 6);

			if (isMeasure) {
				ctx.fillStyle = COLORS.textBright;
				ctx.font = 'bold 10px system-ui, sans-serif';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				ctx.fillText(String(Math.floor(beat / beatsPerMeasure) + 1), x + 4, 6);
			} else if (pixelsPerBeat >= 60) {
				ctx.fillStyle = COLORS.textDim;
				ctx.font = '9px system-ui, sans-serif';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				ctx.fillText(String(beat + 1), x + 3, 8);
			}
		}

		ctx.fillStyle = COLORS.lineMeasure;
		ctx.fillRect(0, RULER_HEIGHT - 1, w, 1);
	}, [timelineCx]);

	const scheduleDraw = useCallback(() => {
		if (rafRef.current != null) return;
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = null;
			draw();
		});
	}, [draw]);

	// MARK: - Canvas setup

	const setupCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const el = containerRef.current;
		if (canvas == null || el == null) return;

		const viewW = Math.max(1, el.clientWidth);
		if (canvas.width !== viewW || canvas.height !== RULER_HEIGHT) {
			canvas.width = viewW;
			canvas.height = RULER_HEIGHT;
		}
		draw();
	}, [draw]);

	// MARK: - Effects

	useEffect(() => { setupCanvas(); }, [song, setupCanvas]);

	useListener(timelineCx.$pixelsPerBeat, () => { scheduleDraw(); }, [scheduleDraw]);
	useListener(timelineCx.$scrollLeft, () => { scheduleDraw(); }, [scheduleDraw]);

	useEffect(() => {
		const el = containerRef.current;
		if (el == null) return;
		const observer = new ResizeObserver(() => setupCanvas());
		observer.observe(el);
		return () => observer.disconnect();
	}, [setupCanvas]);

	// MARK: - Click to seek

	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const s = songRef.current;
		if (s == null) return;
		const t = new NoteTransform(timelineCx.$pixelsPerBeat.get(), s.ticksPerBeat);
		const x = e.clientX - e.currentTarget.getBoundingClientRect().left + timelineCx.$scrollLeft.get();
		onSeek?.(t.toTick(x));
	};

	if (song == null) return null;

	return (
		<div
			className="flex shrink-0"
			style={{ borderBottom: '1px solid var(--color-base-200)' }}
		>
			{/* Corner spacer — sits above piano keys column */}
			<div
				style={{
					width: PIANO_WIDTH,
					height: RULER_HEIGHT,
					flexShrink: 0,
					background: 'var(--color-base-0)',
					borderRight: '1px solid var(--color-base-200)',
				}}
			/>

			{/* Ruler viewport — canvas draws the visible beat range */}
			<div
				ref={containerRef}
				style={{ flex: 1, height: RULER_HEIGHT, overflow: 'hidden', cursor: 'pointer' }}
				onClick={handleClick}
				title="Click to seek"
			>
				<canvas ref={canvasRef} style={{ display: 'block' }} />
			</div>
		</div>
	);
};

// MARK: - Types

interface TNoteRulerProps {
	onSeek?: (tick: number) => void;
}
