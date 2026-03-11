// Track list panel — click a track to highlight it in the piano roll.

import { useFeatureState } from 'feature-react';
import React from 'react';
import { midiConfig } from '../lib';
import { useMidiCx } from '../MidiCx';
import type { MidiTrack } from '../types';

const { sidebarWidth } = midiConfig.layout;

export const TrackPanel: React.FC = () => {
	const midiCx = useMidiCx();
	const song = useFeatureState(midiCx.$song);
	const selectedTrackId = useFeatureState(midiCx.$selectedTrackId);

	if (song == null) return null;

	return (
		<div
			className="flex h-full flex-col shrink-0 border-r"
			style={{ width: sidebarWidth, borderColor: 'var(--color-base-100)', background: 'var(--color-base-0)' }}
		>
			<div
				className="shrink-0 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b"
				style={{ color: 'var(--color-base-400)', borderColor: 'var(--color-base-100)' }}
			>
				Tracks
			</div>

			<div className="flex-1 overflow-y-auto">
				{song.tracks.map((track) => (
					<TrackRow
						key={track.id}
						track={track}
						isSelected={track.id === selectedTrackId}
						onSelect={() => midiCx.selectTrack(track)}
					/>
				))}
			</div>
		</div>
	);
};

// MARK: - Track row

const TrackRow: React.FC<TTrackRowProps> = ({ track, isSelected, onSelect }) => (
	<button
		type="button"
		onClick={onSelect}
		className="flex w-full cursor-pointer items-center gap-2 border-none border-b px-2.5 py-1.5 text-left outline-none"
		style={{
			background: isSelected ? 'var(--color-base-100)' : 'transparent',
			borderColor: 'var(--color-base-100)'
		}}
	>
		<div
			className="h-2 w-2 shrink-0 rounded-sm"
			style={{ background: track.color, opacity: isSelected ? 1 : 0.4 }}
		/>
		<span
			className="min-w-0 flex-1 truncate text-[11px]"
			style={{
				fontWeight: isSelected ? 600 : 400,
				color: isSelected ? 'var(--color-base-600)' : 'var(--color-base-400)'
			}}
		>
			{track.name}
		</span>
		<span className="shrink-0 text-[9px]" style={{ color: 'var(--color-base-300)' }}>
			{track.noteCount}
		</span>
	</button>
);

// MARK: - Types

interface TTrackRowProps {
	track: MidiTrack;
	isSelected: boolean;
	onSelect: () => void;
}
