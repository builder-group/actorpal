import { useFeatureState } from 'feature-react';
import React from 'react';
import { formatMidiDuration } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';

export const MidiToolbar: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	const song = useFeatureState(midiFileCx.$song);
	const isPlaying = useFeatureState(midiFileCx.$isPlaying);
	const playheadTick = useFeatureState(midiFileCx.$playheadTick);
	const pixelsPerBeat = useFeatureState(midiViewportCx.$pixelsPerBeat);

	const inputRef = React.useRef<HTMLInputElement>(null);
	const playheadSeconds =
		song == null || song.ticksPerBeat <= 0
			? 0
			: (playheadTick / song.ticksPerBeat) * (60 / song.bpm);

	// MARK: - Actions

	const handleTogglePlayback = React.useCallback(() => {
		if (isPlaying) {
			midiFileCx.pause();
			return;
		}

		midiFileCx.play();
	}, [isPlaying, midiFileCx]);

	const handleOpenFilePicker = React.useCallback(() => {
		inputRef.current?.click();
	}, []);

	// MARK: - UI

	if (song == null) {
		return null;
	}

	return (
		<header className="bg-base-0 border-base-100 flex h-[34px] shrink-0 items-center gap-1.5 border-b px-2.5">
			<span className="text-base-400 max-w-[120px] truncate text-[11px]" title={song.name}>
				{song.name}
			</span>

			<Divider />

			<ToolbarButton label="Stop" onClick={() => midiFileCx.stop()}>
				&#9632;
			</ToolbarButton>
			<ToolbarButton
				isActive={isPlaying}
				label={isPlaying ? 'Pause' : 'Play'}
				onClick={handleTogglePlayback}
			>
				{isPlaying ? '⏸' : '▶'}
			</ToolbarButton>

			<Divider />

			<span className="text-base-500 min-w-[34px] text-[11px] tabular-nums">
				{formatMidiDuration(playheadSeconds)}
			</span>
			<span className="text-base-400 text-[10px]">{song.bpm} BPM</span>

			<div className="flex-1" />

			<ToolbarButton label="Zoom out" onClick={() => midiViewportCx.zoomOut()}>
				−
			</ToolbarButton>
			<span className="text-base-400 min-w-[52px] text-center text-[10px] tabular-nums">
				{Math.round(pixelsPerBeat)}px/b
			</span>
			<ToolbarButton label="Zoom in" onClick={() => midiViewportCx.zoomIn()}>
				+
			</ToolbarButton>

			<Divider />

			<button
				type="button"
				onClick={handleOpenFilePicker}
				className="bg-base-100 text-base-500 cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold"
			>
				Open MIDI
			</button>

			<input
				ref={inputRef}
				type="file"
				accept=".mid,.midi"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file != null) {
						void midiFileCx.loadFile(file);
					}
					event.target.value = '';
				}}
			/>
		</header>
	);
};

const Divider: React.FC = () => <div className="bg-base-100 h-3.5 w-px shrink-0" />;

const ToolbarButton: React.FC<TToolbarButtonProps> = ({
	children,
	isActive = false,
	label,
	onClick
}) => {
	return (
		<button
			type="button"
			title={label}
			onClick={onClick}
			className={`shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-xs leading-none ${
				isActive ? 'bg-base-100 text-primary' : 'text-base-400'
			}`}
		>
			{children}
		</button>
	);
};

interface TToolbarButtonProps {
	children: React.ReactNode;
	isActive?: boolean;
	label: string;
	onClick: () => void;
}
