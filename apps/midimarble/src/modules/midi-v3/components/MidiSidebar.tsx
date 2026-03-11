import { useFeatureState } from 'feature-react';
import React from 'react';
import { formatMidiV3Channel, getMidiV3NoteName } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';

export const MidiSidebar: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const song = useFeatureState(midiFileCx.$song);
	const selectedTrackId = useFeatureState(midiFileCx.$selectedTrackId);

	if (song == null) {
		return null;
	}

	return (
		<aside className="bg-base-0 border-base-200 flex w-[280px] shrink-0 flex-col border-r">
			<div className="border-base-200 border-b px-4 py-3">
				<p className="text-base-500 text-[10px] font-semibold tracking-[0.24em] uppercase">
					Tracks
				</p>
				<h2 className="text-base-900 mt-2 text-sm font-semibold">{song.name}</h2>
				<p className="text-base-600 mt-1 text-xs">
					{song.tracks.length} tracks · {song.bpm} BPM · {song.totalBeats} beats
				</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{song.tracks.map((track) => {
					const isSelected = track.id === selectedTrackId;
					return (
						<button
							key={track.id}
							type="button"
							onClick={() => midiFileCx.selectTrack(track.id)}
							className="border-base-200 hover:bg-base-50 flex w-full flex-col gap-2 border-b px-4 py-3 text-left transition-colors"
							style={{
								background: isSelected
									? 'color-mix(in srgb, var(--color-base-100) 65%, white)'
									: undefined
							}}
						>
							<div className="flex items-center gap-3">
								<div
									className="h-2.5 w-2.5 shrink-0 rounded-full"
									style={{ background: track.color }}
								/>
								<div className="min-w-0 flex-1">
									<p className="text-base-900 truncate text-sm font-medium">{track.name}</p>
									<p className="text-base-500 mt-0.5 text-[11px]">
										{formatMidiV3Channel(track.channel)} · {track.noteCount} notes
									</p>
								</div>
							</div>
							<div className="text-base-600 grid grid-cols-3 gap-2 text-[10px]">
								<span>Range {getMidiV3NoteName(track.minNote)}</span>
								<span>to {getMidiV3NoteName(track.maxNote)}</span>
								<span className="text-right">
									{Math.max(0, track.endTick - track.startTick)} ticks
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</aside>
	);
};
