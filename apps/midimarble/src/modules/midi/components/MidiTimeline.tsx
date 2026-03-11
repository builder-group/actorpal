import React from 'react';
import { useFeatureState, useListener } from 'feature-react';
import { midiConfig, MidiLayout } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';

const beatsPerMeasure = 4;

export const MidiTimeline: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	// MARK: - State and Memos

	const song = useFeatureState(midiFileCx.$song);
	const [showMinorLabels, setShowMinorLabels] = React.useState(
		midiViewportCx.$pixelsPerBeat.get() >= 56
	);

	const scrollRef = React.useRef<HTMLDivElement>(null);
	const innerRef = React.useRef<HTMLDivElement>(null);

	const layout = React.useMemo(
		() => (song == null ? null : midiViewportCx.getLayout(song)),
		[midiViewportCx, song]
	);

	const contentWidth = layout == null || song == null ? 0 : layout.getContentWidth(song.totalTicks);

	// MARK: - Actions

	const handleSeek = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			const nextSong = midiFileCx.$song.get();
			if (nextSong == null) {
				return;
			}

			const nextLayout = midiViewportCx.getLayout(nextSong);
			const x =
				event.clientX -
				event.currentTarget.getBoundingClientRect().left +
				midiViewportCx.$scrollLeft.get();
			midiFileCx.seekToTick(nextLayout.pxToTick(x));
		},
		[midiFileCx, midiViewportCx]
	);

	// MARK: - Effects

	useListener(
		midiViewportCx.$pixelsPerBeat,
		({ value }) => {
			const currentSong = midiFileCx.$song.get();
			if (currentSong == null || innerRef.current == null) {
				return;
			}

			const nextLayout = new MidiLayout(value, currentSong.ticksPerBeat);
			innerRef.current.style.width = `${nextLayout.getContentWidth(currentSong.totalTicks)}px`;

			const nextShowMinorLabels = value >= 56;
			setShowMinorLabels((prev) => (prev === nextShowMinorLabels ? prev : nextShowMinorLabels));
		},
		[midiFileCx, midiViewportCx]
	);

	useListener(
		midiViewportCx.$scrollLeft,
		({ value }) => {
			if (scrollRef.current != null) {
				scrollRef.current.scrollLeft = value;
			}
		},
		[midiViewportCx]
	);

	// MARK: - UI

	if (song == null || layout == null) {
		return null;
	}

	return (
		<div className="border-base-200 flex shrink-0 border-b" style={{ height: midiConfig.layout.rulerHeight }}>
			<div className="bg-base-0 border-base-200 shrink-0 border-r" style={{ width: midiConfig.layout.keyboardWidth }} />

			<div ref={scrollRef} className="flex-1 overflow-hidden" onClick={handleSeek}>
				<div ref={innerRef} className="bg-base-0 relative h-full" style={{ width: contentWidth }}>
					{Array.from({ length: song.totalBeats + 1 }, (_, beat) => {
						const isMeasure = beat % beatsPerMeasure === 0;
						if (!isMeasure && !showMinorLabels) {
							return null;
						}

						return (
							<div
								key={beat}
								className="absolute top-0 bottom-0"
								style={{ left: `${layout.tickToContentPercent(beat * song.ticksPerBeat, song.totalTicks)}%` }}
							>
								<div
									className={isMeasure ? 'bg-base-400 absolute bottom-0 w-px' : 'bg-base-200 absolute bottom-0 w-px'}
									style={{ height: isMeasure ? 16 : 7 }}
								/>
								<span
									className={
										isMeasure
											? 'text-base-600 absolute left-1 top-1 select-none text-[9px] font-bold'
											: 'text-base-400 absolute left-1 top-1 select-none text-[9px]'
									}
								>
									{isMeasure ? Math.floor(beat / beatsPerMeasure) + 1 : beat + 1}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
