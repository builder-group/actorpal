// Transport controls: play/pause/stop, time display, zoom, file picker.

import React, { useCallback, useMemo, useRef } from 'react';
import { useFeatureState } from 'feature-react';
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
			className="flex items-center gap-1.5 shrink-0 px-2.5"
			style={{
				height: 34,
				background: 'var(--color-base-0)',
				borderBottom: '1px solid var(--color-base-100)',
			}}
		>
			{/* Song name */}
			<span className="text-[11px] max-w-[120px] truncate" style={{ color: 'var(--color-base-400)' }}>
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
				className="text-[11px] tabular-nums min-w-[34px]"
				style={{ color: 'var(--color-base-500)' }}
			>
				{timeStr}
			</span>

			<div className="flex-1" />

			{/* Zoom */}
			<Btn label="−" title="Zoom out (Ctrl+Scroll)" onClick={() => timelineCx.zoomOut()} />
			<span className="text-[10px] text-center min-w-[52px]" style={{ color: 'var(--color-base-400)' }}>
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
	<div className="w-px h-3.5 shrink-0" style={{ background: 'var(--color-base-100)' }} />
);

const Btn: React.FC<TBtnProps> = (props) => {
	const { label, title, onClick, active = false } = props;
	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			className="shrink-0 rounded cursor-pointer text-xs leading-none px-1.5 py-0.5 border-none"
			style={{
				background: active ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
				color: active ? 'var(--color-primary)' : 'var(--color-base-400)',
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
		[midiCx],
	);

	return (
		<>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				className="rounded text-[10px] font-semibold cursor-pointer border-none px-2 py-0.5"
				style={{
					background: 'var(--color-base-100)',
					color: 'var(--color-base-500)',
				}}
			>
				Open MIDI
			</button>
			<input ref={inputRef} type="file" accept=".mid,.midi" className="hidden" onChange={handleChange} />
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
