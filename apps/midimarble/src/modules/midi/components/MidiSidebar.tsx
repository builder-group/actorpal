import React from 'react';
import { useFeatureState } from 'feature-react';
import { formatMidiChannel, getMidiNoteName, midiConfig } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';

export const MidiSidebar: React.FC = () => {
	const midiFileCx = useMidiFileCx();

	// MARK: - State and Memos

	const song = useFeatureState(midiFileCx.$song);
	const selectedTrackId = useFeatureState(midiFileCx.$selectedTrackId);

	// MARK: - Actions

	const handleSelectTrack = React.useCallback(
		(trackId: number) => {
			midiFileCx.selectTrack(trackId);
		},
		[midiFileCx]
	);

	// MARK: - Effects

	// MARK: - UI

	if (song == null) {
		return null;
	}

	return (
		<aside className="bg-base-0 border-base-200 shrink-0 border-r" style={{ width: midiConfig.layout.sidebarWidth }}>
			<div className="border-base-200 border-b px-3 py-2">
				<p className="text-base-500 text-[10px] font-semibold uppercase tracking-[0.2em]">Tracks</p>
				<p className="text-base-600 mt-1 text-[11px]">
					{song.tracks.length} tracks · {song.totalBeats} beats · {song.bpm} BPM
				</p>
			</div>

			<div className="min-h-0 overflow-y-auto">
				{song.tracks.map((track) => {
					const isSelected = track.id === selectedTrackId;
					return (
						<button
							key={track.id}
							type="button"
							onClick={() => handleSelectTrack(track.id)}
							className="border-base-100 flex w-full cursor-pointer flex-col gap-1 border-b px-3 py-2 text-left"
							style={{
								background: isSelected
									? 'color-mix(in srgb, var(--color-base-100) 70%, white)'
									: 'transparent',
							}}
						>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 shrink-0 rounded-sm" style={{ background: track.color }} />
								<span
									className={
										isSelected
											? 'text-base-700 min-w-0 flex-1 truncate text-[11px]'
											: 'text-base-600 min-w-0 flex-1 truncate text-[11px]'
									}
								>
									{track.name}
								</span>
								<span className="text-base-400 text-[9px]">{track.noteCount}</span>
							</div>

							<div className="text-base-400 flex items-center gap-2 text-[9px]">
								<span>{formatMidiChannel(track.channel)}</span>
								<span>
									{getMidiNoteName(track.minNote)}-{getMidiNoteName(track.maxNote)}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</aside>
	);
};
