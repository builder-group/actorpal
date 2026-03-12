import { useFeatureState } from 'feature-react';
import React from 'react';
import { formatMidiChannel, getMidiNoteName, midiConfig } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';

export const MidiSidebar: React.FC = () => {
	const midiFileCx = useMidiFileCx();

	const song = useFeatureState(midiFileCx.$song);
	const selectedTrackId = useFeatureState(midiFileCx.$selectedTrackId);

	// MARK: - Actions

	const handleSelectTrack = React.useCallback(
		(trackId: number) => {
			midiFileCx.selectTrack(trackId);
		},
		[midiFileCx]
	);

	// MARK: - UI

	if (song == null) {
		return null;
	}

	return (
		<aside className="bg-base-0 flex h-full w-full flex-col overflow-hidden">
			<div className="border-base-100 shrink-0 border-b px-3 py-1.5">
				<p className="text-base-400 text-[10px] font-semibold tracking-wider uppercase">Tracks</p>
				<p className="text-base-400 mt-1 text-[9px]">
					{song.tracks.length} · {song.totalBeats} beats · {song.bpm} BPM
				</p>
			</div>

			<div className="flex-1 overflow-y-auto">
				{song.tracks.map((track) => {
					const isSelected = track.id === selectedTrackId;
					return (
						<button
							key={track.id}
							type="button"
							onClick={() => handleSelectTrack(track.id)}
							className={`border-base-100 flex w-full cursor-pointer flex-col gap-1 border-b px-2.5 py-1.5 text-left ${
								isSelected ? 'bg-base-100' : 'bg-transparent'
							}`}
						>
							<div className="flex items-center gap-2">
								<div
									className="h-2 w-2 shrink-0 rounded-sm"
									style={{ background: track.color, opacity: isSelected ? 1 : 0.4 }}
								/>

								<span
									className={`min-w-0 flex-1 truncate text-[11px] ${
										isSelected ? 'text-base-600 font-semibold' : 'text-base-400'
									}`}
								>
									{track.name}
								</span>

								<span className="text-base-300 shrink-0 text-[9px]">{track.noteCount}</span>
							</div>

							<div className="text-base-300 flex items-center gap-2 text-[9px]">
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
