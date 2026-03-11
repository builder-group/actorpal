import { useFeatureState } from 'feature-react';
import React from 'react';
import { formatMidiDuration } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';

export const MidiToolbar: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	// MARK: - State and Memos

	const song = useFeatureState(midiFileCx.$song);
	const isPlaying = useFeatureState(midiFileCx.$isPlaying);
	const playheadTick = useFeatureState(midiFileCx.$playheadTick);
	const pixelsPerBeat = useFeatureState(midiViewportCx.$pixelsPerBeat);

	const inputRef = React.useRef<HTMLInputElement>(null);
	const playheadSeconds =
		song == null || song.ticksPerBeat <= 0 ? 0 : (playheadTick / song.ticksPerBeat) * (60 / song.bpm);

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

	// MARK: - Effects

	// MARK: - UI

	if (song == null) {
		return null;
	}

	return (
		<header className="bg-base-0 border-base-200 flex h-9 shrink-0 items-center gap-2 border-b px-3">
			<div className="min-w-0">
				<p className="text-base-700 truncate text-[11px] font-semibold">{song.name}</p>
			</div>

			<Divider />

			<ToolbarButton label="Stop" onClick={() => midiFileCx.stop()}>
				&#9632;
			</ToolbarButton>
			<ToolbarButton label={isPlaying ? 'Pause' : 'Play'} onClick={handleTogglePlayback} isActive={isPlaying}>
				{isPlaying ? '||' : '>'}
			</ToolbarButton>

			<Divider />

			<span className="text-base-500 min-w-[38px] text-[11px] tabular-nums">{formatMidiDuration(playheadSeconds)}</span>
			<span className="text-base-400 text-[10px]">{song.bpm} BPM</span>

			<div className="flex-1" />

			<ToolbarButton label="Zoom out" onClick={() => midiViewportCx.zoomOut()}>
				-
			</ToolbarButton>
			<span className="text-base-400 min-w-[62px] text-center text-[10px]">{Math.round(pixelsPerBeat)} px/beat</span>
			<ToolbarButton label="Zoom in" onClick={() => midiViewportCx.zoomIn()}>
				+
			</ToolbarButton>

			<Divider />

			<button
				type="button"
				onClick={handleOpenFilePicker}
				className="bg-base-100 text-base-600 cursor-pointer rounded px-2 py-1 text-[10px] font-semibold"
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

const Divider: React.FC = () => <div className="bg-base-200 h-3.5 w-px shrink-0" />;

const ToolbarButton: React.FC<TToolbarButtonProps> = ({ children, isActive = false, label, onClick }) => {
	return (
		<button
			type="button"
			title={label}
			onClick={onClick}
			className="min-w-6 cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-semibold"
			style={{
				background: isActive ? 'color-mix(in srgb, var(--color-primary) 14%, white)' : 'transparent',
				color: isActive ? 'var(--color-primary)' : undefined,
			}}
		>
			<span className={isActive ? undefined : 'text-base-500'}>{children}</span>
		</button>
	);
};

interface TToolbarButtonProps {
	children: React.ReactNode;
	isActive?: boolean;
	label: string;
	onClick: () => void;
}
