import { useFeatureState } from 'feature-react';
import { Music2, Pause, Play, Square, ZoomIn, ZoomOut } from 'lucide-react';
import React from 'react';
import { formatMidiV3Duration } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';

export const MidiToolbar: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	const song = useFeatureState(midiFileCx.$song);
	const isPlaying = useFeatureState(midiFileCx.$isPlaying);
	const playheadTick = useFeatureState(midiFileCx.$playheadTick);
	const pixelsPerBeat = useFeatureState(midiViewportCx.$pixelsPerBeat);

	if (song == null) {
		return null;
	}

	const playheadSeconds =
		song.ticksPerBeat > 0 ? (playheadTick / song.ticksPerBeat) * (60 / song.bpm) : 0;

	return (
		<header className="bg-base-0 border-base-200 flex items-center gap-3 border-b px-4 py-3">
			<div className="flex min-w-0 items-center gap-3">
				<div className="bg-base-100 text-base-700 grid h-10 w-10 place-items-center rounded-xl">
					<Music2 size={18} />
				</div>
				<div className="min-w-0">
					<p className="text-base-900 truncate text-sm font-semibold">{song.name}</p>
					<p className="text-base-500 truncate text-xs">
						{song.fileName ?? 'Loaded from memory'} · {song.tracks.length} tracks
					</p>
				</div>
			</div>

			<div className="bg-base-50 border-base-200 ml-2 flex items-center gap-1 rounded-full border px-1.5 py-1">
				<ToolbarButton label="Stop" onClick={() => midiFileCx.stop()} icon={<Square size={14} />} />
				<ToolbarButton
					label={isPlaying ? 'Pause' : 'Play'}
					onClick={() => (isPlaying ? midiFileCx.pause() : midiFileCx.play())}
					icon={isPlaying ? <Pause size={14} /> : <Play size={14} />}
					active={isPlaying}
				/>
			</div>

			<div className="text-base-600 ml-2 flex items-center gap-5 text-xs">
				<span className="font-medium tabular-nums">{formatMidiV3Duration(playheadSeconds)}</span>
				<span>{song.bpm} BPM</span>
				<span>{song.totalBeats} beats</span>
			</div>

			<div className="ml-auto flex items-center gap-2">
				<ToolbarButton
					label="Zoom out"
					onClick={() => midiViewportCx.zoomOut()}
					icon={<ZoomOut size={14} />}
				/>
				<span className="text-base-500 min-w-[72px] text-center text-xs">
					{Math.round(pixelsPerBeat)} px/beat
				</span>
				<ToolbarButton
					label="Zoom in"
					onClick={() => midiViewportCx.zoomIn()}
					icon={<ZoomIn size={14} />}
				/>
			</div>
		</header>
	);
};

const ToolbarButton: React.FC<TToolbarButtonProps> = ({ active = false, icon, label, onClick }) => {
	return (
		<button
			type="button"
			onClick={onClick}
			title={label}
			className="text-base-700 hover:bg-base-100 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
			style={{
				background: active ? 'color-mix(in srgb, var(--color-primary) 14%, white)' : undefined,
				color: active ? 'var(--color-primary)' : undefined
			}}
		>
			{icon}
		</button>
	);
};

interface TToolbarButtonProps {
	active?: boolean;
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}
