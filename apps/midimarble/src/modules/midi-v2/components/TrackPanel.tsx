// Track list panel — click a track to highlight it in the piano roll.

import { useFeatureState } from 'feature-react';
import React from 'react';
import { useMidiCx } from '../MidiCx';
import type { TMidiTrack } from '../types';

export const TrackPanel: React.FC = () => {
	const cx = useMidiCx();
	const song = useFeatureState(cx.$song);
	const selectedTrackId = useFeatureState(cx.$selectedTrackId);

	if (song == null) return null;

	return (
		<div
			className="flex h-full flex-col"
			style={{
				background: 'var(--color-base-0)',
				borderRight: '1px solid var(--color-base-100)'
			}}
		>
			{/* Header */}
			<div
				className="shrink-0 px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase"
				style={{
					color: 'var(--color-base-400)',
					borderBottom: '1px solid var(--color-base-100)'
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
			className="flex w-full cursor-pointer items-center gap-2 border-none px-2.5 py-1.5 text-left outline-none"
			style={{
				background: isSelected ? 'var(--color-base-100)' : 'transparent',
				borderBottom: '1px solid var(--color-base-100)'
			}}
		>
			{/* Color dot */}
			<div
				className="h-2 w-2 shrink-0 rounded-sm"
				style={{ background: track.color, opacity: isSelected ? 1 : 0.4 }}
			/>

			{/* Name */}
			<span
				className="min-w-0 flex-1 truncate text-[11px]"
				style={{
					fontWeight: isSelected ? 600 : 400,
					color: isSelected ? 'var(--color-base-600)' : 'var(--color-base-400)'
				}}
			>
				{track.name}
			</span>

			{/* Note count badge */}
			<span className="shrink-0 text-[9px]" style={{ color: 'var(--color-base-300)' }}>
				{track.notes.length}
			</span>
		</button>
	);
};

// MARK: - Types

interface TTrackRowProps {
	track: TMidiTrack;
	isSelected: boolean;
	onSelect: () => void;
}
