import { useFeatureState } from 'feature-react';
import React from 'react';
import { MIDI_V3_KEYBOARD_WIDTH, MIDI_V3_RULER_HEIGHT } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';

const BEATS_PER_MEASURE = 4;

export const MidiTimelineAxis: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	const song = useFeatureState(midiFileCx.$song);
	const pixelsPerBeat = useFeatureState(midiViewportCx.$pixelsPerBeat);
	const scrollLeft = useFeatureState(midiViewportCx.$scrollLeft);

	if (song == null) {
		return null;
	}

	const contentWidth = midiViewportCx.getContentWidth(song);
	const showMinorLabels = pixelsPerBeat >= 52;

	return (
		<div
			className="bg-base-0 border-base-200 flex shrink-0 border-b"
			style={{ height: MIDI_V3_RULER_HEIGHT }}
		>
			<div
				className="border-base-200 bg-base-50 shrink-0 border-r"
				style={{ width: MIDI_V3_KEYBOARD_WIDTH }}
			/>
			<div className="relative flex-1 overflow-hidden">
				<div
					className="relative h-full"
					style={{
						width: contentWidth,
						transform: `translateX(${-scrollLeft}px)`
					}}
				>
					{Array.from({ length: song.totalBeats + 1 }, (_, beat) => {
						const isMeasure = beat % BEATS_PER_MEASURE === 0;
						return (
							<div
								key={beat}
								className="absolute top-0 bottom-0"
								style={{ left: (beat / Math.max(1, song.totalBeats)) * contentWidth }}
							>
								<div
									className="absolute bottom-0 w-px"
									style={{
										height: isMeasure ? 18 : 8,
										background: isMeasure ? 'var(--color-base-400)' : 'var(--color-base-200)'
									}}
								/>
								{(isMeasure || showMinorLabels) && (
									<span
										className="absolute top-2 left-2 text-[10px] select-none"
										style={{ color: isMeasure ? 'var(--color-base-700)' : 'var(--color-base-500)' }}
									>
										{isMeasure ? `M${Math.floor(beat / BEATS_PER_MEASURE) + 1}` : beat + 1}
									</span>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
