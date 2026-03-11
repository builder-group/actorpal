// Track list panel — click a track to highlight it in the piano roll.

import React from 'react';
import { useFeatureState } from 'feature-react';
import { useMidiCx } from '../MidiCx';
import type { MidiTrack } from '../types';

export const TrackPanel: React.FC = () => {
	const cx = useMidiCx();
	const song = useFeatureState(cx.$song);
	const selectedTrackId = useFeatureState(cx.$selectedTrackId);

	if (song == null) return null;

	return (
		<div
			className="flex flex-col h-full"
			style={{
				background: 'var(--color-base-0)',
				borderRight: '1px solid var(--color-base-100)',
			}}
		>
			{/* Header */}
			<div
				className="px-3 py-1.5 shrink-0 uppercase tracking-wider text-[10px] font-semibold"
				style={{
					color: 'var(--color-base-400)',
					borderBottom: '1px solid var(--color-base-100)',
				}}
			>
				Tracks
			</div>

			{/* Track list */}
			<div className="flex-1 overflow-y-auto">
				{song.tracks.map((track) => (
					<TrackRow
						key={track.id}
						track={track}
						isSelected={track.id === selectedTrackId}
						onSelect={() => cx.selectTrack(track)}
					/>
				))}
			</div>
		</div>
	);
};

// MARK: - Track row

const TrackRow: React.FC<TTrackRowProps> = (props) => {
	const { track, isSelected, onSelect } = props;

	return (
		<button
			type="button"
			onClick={onSelect}
			className="flex items-center gap-2 w-full text-left outline-none cursor-pointer border-none py-1.5 px-2.5"
			style={{
				background: isSelected ? 'var(--color-base-100)' : 'transparent',
				borderBottom: '1px solid var(--color-base-100)',
			}}
		>
			{/* Color dot */}
			<div
				className="w-2 h-2 rounded-sm shrink-0"
				style={{ background: track.color, opacity: isSelected ? 1 : 0.4 }}
			/>

			{/* Name */}
			<span
				className="text-[11px] truncate flex-1 min-w-0"
				style={{
					fontWeight: isSelected ? 600 : 400,
					color: isSelected ? 'var(--color-base-600)' : 'var(--color-base-400)',
				}}
			>
				{track.name}
			</span>

			{/* Note count badge */}
			<span className="text-[9px] shrink-0" style={{ color: 'var(--color-base-300)' }}>
				{track.notes.length}
			</span>
		</button>
	);
};

// MARK: - Types

interface TTrackRowProps {
	track: MidiTrack;
	isSelected: boolean;
	onSelect: () => void;
}
