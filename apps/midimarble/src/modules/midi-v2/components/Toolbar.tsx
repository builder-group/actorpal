// Transport controls: play/pause/stop, time display, zoom, file picker.

import { useFeatureState } from 'feature-react';
import React, { useCallback, useMemo, useRef } from 'react';
import { useMidiCx } from '../MidiCx';
import { useTimelineCx } from '../TimelineCx';

export const Toolbar: React.FC = () => {
	const midiCx = useMidiCx();
	const timelineCx = useTimelineCx();

	const song = useFeatureState(midiCx.$song);
	const isPlaying = useFeatureState(midiCx.$isPlaying);
	const playheadTick = useFeatureState(midiCx.$playheadTick);
	const pixelsPerBeat = useFeatureState(timelineCx.$pixelsPerBeat);

	const timeStr = useMemo(() => {
		if (song == null) return '0:00';
		const seconds = (playheadTick / song.ticksPerBeat) * (60 / song.bpm);
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${String(s).padStart(2, '0')}`;
	}, [playheadTick, song]);

	if (song == null) return null;

	return (
		<div
			className="flex shrink-0 items-center gap-1.5 px-2.5"
			style={{
				height: 34,
				background: 'var(--color-base-0)',
				borderBottom: '1px solid var(--color-base-100)'
			}}
		>
			{/* Song name */}
			<span
				className="max-w-[120px] truncate text-[11px]"
				style={{ color: 'var(--color-base-400)' }}
			>
				{song.name}
			</span>

			<Divider />

			{/* Transport */}
			<Btn label="◼" title="Stop" onClick={() => midiCx.stop()} />
			<Btn
				label={isPlaying ? '⏸' : '▶'}
				title={isPlaying ? 'Pause' : 'Play'}
				onClick={() => (isPlaying ? midiCx.pause() : midiCx.play())}
				active={isPlaying}
			/>

			<Divider />

			{/* Time */}
			<span
				className="min-w-[34px] text-[11px] tabular-nums"
				style={{ color: 'var(--color-base-500)' }}
			>
				{timeStr}
			</span>

			<div className="flex-1" />

			{/* Zoom */}
			<Btn label="−" title="Zoom out (Ctrl+Scroll)" onClick={() => timelineCx.zoomOut()} />
			<span
				className="min-w-[52px] text-center text-[10px]"
				style={{ color: 'var(--color-base-400)' }}
			>
				{Math.round(pixelsPerBeat)}px/beat
			</span>
			<Btn label="+" title="Zoom in (Ctrl+Scroll)" onClick={() => timelineCx.zoomIn()} />

			<Divider />

			<FilePicker />
		</div>
	);
};

// MARK: - Sub-components

const Divider: React.FC = () => (
	<div className="h-3.5 w-px shrink-0" style={{ background: 'var(--color-base-100)' }} />
);

const Btn: React.FC<TBtnProps> = (props) => {
	const { label, title, onClick, active = false } = props;
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			className="shrink-0 cursor-pointer rounded border-none px-1.5 py-0.5 text-xs leading-none"
			style={{
				background: active
					? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
					: 'transparent',
				color: active ? 'var(--color-primary)' : 'var(--color-base-400)'
			}}
		>
			{label}
		</button>
	);
};

const FilePicker: React.FC = () => {
	const midiCx = useMidiCx();
	const inputRef = useRef<HTMLInputElement>(null);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file != null) void midiCx.loadFile(file);
			e.target.value = '';
		},
		[midiCx]
	);

	return (
		<>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				className="cursor-pointer rounded border-none px-2 py-0.5 text-[10px] font-semibold"
				style={{
					background: 'var(--color-base-100)',
					color: 'var(--color-base-500)'
				}}
			>
				Open MIDI
			</button>
			<input
				ref={inputRef}
				type="file"
				accept=".mid,.midi"
				className="hidden"
				onChange={handleChange}
			/>
		</>
	);
};

// MARK: - Types

interface TBtnProps {
	label: string;
	title: string;
	onClick: () => void;
	active?: boolean;
}
