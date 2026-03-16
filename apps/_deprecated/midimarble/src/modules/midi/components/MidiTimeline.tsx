import { useFeatureState, useListener } from 'feature-react';
import React from 'react';
import { midiConfig, MidiLayout } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';

const beatsPerMeasure = 4;

export const MidiTimeline: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	const song = useFeatureState(midiFileCx.$song);
	const [showMinorLabels, setShowMinorLabels] = React.useState(
		midiViewportCx.$pixelsPerBeat.get() >= 56
	);

	const scrollRef = React.useRef<HTMLDivElement>(null);
	const innerRef = React.useRef<HTMLDivElement>(null);
	const markerRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

	const layout = React.useMemo(
		() => (song == null ? null : midiViewportCx.getLayout(song)),
		[midiViewportCx, song]
	);

	// MARK: - Actions

	const updateMarkerPosition = React.useCallback(
		(beat: number, element: HTMLDivElement) => {
			element.style.left = `${beat * midiViewportCx.$pixelsPerBeat.get()}px`;
		},
		[midiViewportCx]
	);

	const updateTimelineGeometry = React.useCallback(
		(pixelsPerBeat: number) => {
			const currentSong = midiFileCx.$song.get();
			if (currentSong == null) {
				return;
			}

			const nextLayout = new MidiLayout(pixelsPerBeat, currentSong.ticksPerBeat);
			if (innerRef.current != null) {
				innerRef.current.style.width = `${nextLayout.notesWidth(currentSong.totalTicks)}px`;
				innerRef.current.style.paddingRight = `${nextLayout.endPadding()}px`;
			}

			for (const [beat, element] of markerRefs.current) {
				updateMarkerPosition(beat, element);
			}
		},
		[midiFileCx, updateMarkerPosition]
	);

	const setMarkerRef = React.useCallback(
		(beat: number, element: HTMLDivElement | null) => {
			if (element == null) {
				markerRefs.current.delete(beat);
				return;
			}

			markerRefs.current.set(beat, element);
			updateMarkerPosition(beat, element);
		},
		[updateMarkerPosition]
	);

	const handleSeek = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			const currentSong = midiFileCx.$song.get();
			if (currentSong == null) {
				return;
			}

			const currentLayout = midiViewportCx.getLayout(currentSong);
			const x =
				event.clientX -
				event.currentTarget.getBoundingClientRect().left +
				midiViewportCx.$scrollLeft.get();
			midiFileCx.seekToTick(currentLayout.pxToTick(x));
		},
		[midiFileCx, midiViewportCx]
	);

	// MARK: - Effects

	useListener(
		midiViewportCx.$pixelsPerBeat,
		({ value }) => {
			updateTimelineGeometry(value);

			const nextShowMinorLabels = value >= 56;
			setShowMinorLabels((previousValue) =>
				previousValue === nextShowMinorLabels ? previousValue : nextShowMinorLabels
			);
		},
		[updateTimelineGeometry]
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

	React.useEffect(() => {
		updateTimelineGeometry(midiViewportCx.$pixelsPerBeat.get());
	}, [midiViewportCx, song, updateTimelineGeometry, showMinorLabels]);

	// MARK: - UI

	if (song == null || layout == null) {
		return null;
	}

	return (
		<div
			className="border-base-200 flex shrink-0 border-b"
			style={{ height: midiConfig.layout.rulerHeight }}
		>
			<div
				className="bg-base-0 border-base-200 shrink-0 border-r"
				style={{ width: midiConfig.layout.keyboardWidth }}
			/>

			<div ref={scrollRef} className="flex-1 overflow-hidden" onClick={handleSeek}>
				<div
					ref={innerRef}
					className="bg-base-0 relative h-full"
					style={{ width: layout.notesWidth(song.totalTicks), paddingRight: layout.endPadding() }}
				>
					{Array.from({ length: song.totalBeats + 1 }, (_, beat) => {
						const isMeasure = beat % beatsPerMeasure === 0;
						if (!isMeasure && !showMinorLabels) {
							return null;
						}

						return (
							<div
								key={beat}
								ref={(element) => setMarkerRef(beat, element)}
								className="absolute inset-y-0"
							>
								<div
									className={
										isMeasure
											? 'bg-base-300 absolute bottom-0 w-px'
											: 'bg-base-200 absolute bottom-0 w-px'
									}
									style={{ height: isMeasure ? 14 : 6 }}
								/>

								<span
									className={
										isMeasure
											? 'text-base-500 absolute top-1 left-0.5 text-[9px] font-bold select-none'
											: 'text-base-300 absolute top-1 left-0.5 text-[9px] select-none'
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
