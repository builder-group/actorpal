import { useFeatureState } from 'feature-react';
import React from 'react';
import {
	isMidiV3BlackKey,
	isMidiV3CNote,
	MIDI_V3_DEFAULT_SCROLL_NOTE,
	MIDI_V3_GRID_HEIGHT,
	MIDI_V3_KEYBOARD_WIDTH,
	MIDI_V3_NOTE_HEIGHT,
	MIDI_V3_TOTAL_NOTES
} from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';
import { MidiKeyboard } from './MidiKeyboard';

export const MidiPianoRoll: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	const song = useFeatureState(midiFileCx.$song);
	const selectedTrackId = useFeatureState(midiFileCx.$selectedTrackId);
	const playheadTick = useFeatureState(midiFileCx.$playheadTick);
	const isPlaying = useFeatureState(midiFileCx.$isPlaying);
	const pixelsPerBeat = useFeatureState(midiViewportCx.$pixelsPerBeat);
	const scrollLeft = useFeatureState(midiViewportCx.$scrollLeft);

	const playheadRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const container = midiViewportCx.scrollContainerRef.current;
		if (container == null) {
			return;
		}

		const updateRect = () => {
			const rect = container.getBoundingClientRect();
			midiViewportCx.setContainerRect({ width: rect.width, left: rect.left, height: rect.height });
		};

		updateRect();
		window.addEventListener('resize', updateRect);
		return () => window.removeEventListener('resize', updateRect);
	}, [midiViewportCx]);

	React.useEffect(() => {
		if (song == null) {
			return;
		}

		const container = midiViewportCx.scrollContainerRef.current;
		if (container == null) {
			return;
		}

		container.scrollTop = Math.max(
			0,
			(MIDI_V3_TOTAL_NOTES - 1 - MIDI_V3_DEFAULT_SCROLL_NOTE) * MIDI_V3_NOTE_HEIGHT -
				container.clientHeight / 2
		);
		midiViewportCx.setScrollPosition(container.scrollLeft, container.scrollTop);
	}, [midiViewportCx, song]);

	React.useEffect(() => {
		if (song == null) {
			return;
		}

		const playhead = playheadRef.current;
		const container = midiViewportCx.scrollContainerRef.current;
		if (playhead == null || container == null) {
			return;
		}

		const playheadX = midiViewportCx.tickToPx(song, playheadTick);
		playhead.style.left = `${playheadX}px`;

		if (!isPlaying) {
			return;
		}

		const viewportLeft = scrollLeft;
		const viewportRight = scrollLeft + container.clientWidth - MIDI_V3_KEYBOARD_WIDTH;
		const margin = container.clientWidth * 0.2;

		if (playheadX < viewportLeft || playheadX > viewportRight - margin) {
			const nextScrollLeft = Math.max(0, playheadX - margin);
			midiViewportCx.isProgrammaticScroll = true;
			container.scrollLeft = nextScrollLeft;
			midiViewportCx.setScrollPosition(nextScrollLeft, container.scrollTop);
			requestAnimationFrame(() => {
				midiViewportCx.isProgrammaticScroll = false;
			});
		}
	}, [isPlaying, midiViewportCx, playheadTick, scrollLeft, song]);

	React.useEffect(() => {
		const container = midiViewportCx.scrollContainerRef.current;
		if (container == null) {
			return;
		}

		const handleWheel = (event: WheelEvent) => {
			if (!event.ctrlKey && !event.metaKey) {
				return;
			}

			if (song == null) {
				return;
			}

			event.preventDefault();
			midiViewportCx.zoomAtClientX(song, event.clientX, event.deltaY > 0 ? 1 / 1.15 : 1.15);
		};

		container.addEventListener('wheel', handleWheel, { passive: false });
		return () => container.removeEventListener('wheel', handleWheel);
	}, [midiViewportCx, song]);

	if (song == null) {
		return null;
	}

	const contentWidth = midiViewportCx.getContentWidth(song);
	const selectedTrack =
		song.tracks.find((track) => track.id === selectedTrackId) ?? song.tracks[0] ?? null;
	const selectedTrackColor = selectedTrack?.color ?? 'var(--color-primary)';

	return (
		<div
			ref={midiViewportCx.scrollContainerRef}
			className="bg-base-0 min-h-0 flex-1 overflow-auto"
			onScroll={(event) => {
				if (midiViewportCx.isProgrammaticScroll) {
					return;
				}

				midiViewportCx.setScrollPosition(
					event.currentTarget.scrollLeft,
					event.currentTarget.scrollTop
				);
			}}
		>
			<div
				className="relative flex"
				style={{ width: contentWidth + MIDI_V3_KEYBOARD_WIDTH, height: MIDI_V3_GRID_HEIGHT }}
			>
				<MidiKeyboard accentColor={selectedTrackColor} />

				<div className="relative" style={{ width: contentWidth, height: MIDI_V3_GRID_HEIGHT }}>
					<div className="absolute inset-0">
						{Array.from({ length: MIDI_V3_TOTAL_NOTES }, (_, index) => {
							const noteNumber = MIDI_V3_TOTAL_NOTES - 1 - index;
							return (
								<div
									key={noteNumber}
									className="border-base-200/80 border-b"
									style={{
										height: MIDI_V3_NOTE_HEIGHT,
										background: isMidiV3CNote(noteNumber)
											? 'color-mix(in srgb, var(--color-base-100) 55%, white)'
											: isMidiV3BlackKey(noteNumber)
												? 'color-mix(in srgb, var(--color-base-50) 72%, var(--color-base-200))'
												: 'white'
									}}
								/>
							);
						})}
					</div>

					<div
						className="pointer-events-none absolute inset-0"
						style={{
							backgroundImage: [
								'linear-gradient(to right, color-mix(in srgb, var(--color-base-300) 55%, transparent) 1px, transparent 1px)',
								'linear-gradient(to right, color-mix(in srgb, var(--color-base-200) 55%, transparent) 1px, transparent 1px)'
							].join(', '),
							backgroundSize: `${pixelsPerBeat * 4}px 100%, ${pixelsPerBeat}px 100%`
						}}
					/>

					{song.tracks.map((track) => {
						const isSelected = track.id === selectedTrackId;
						return (
							<div
								key={track.id}
								className="pointer-events-none absolute inset-0"
								style={{ zIndex: isSelected ? 2 : 1 }}
							>
								{track.notes.map((note) => (
									<div
										key={note.id}
										className="absolute rounded-sm"
										style={{
											left: `${(note.tick / Math.max(1, song.totalTicks)) * 100}%`,
											width: `${(note.durationTicks / Math.max(1, song.totalTicks)) * 100}%`,
											top: (MIDI_V3_TOTAL_NOTES - 1 - note.noteNumber) * MIDI_V3_NOTE_HEIGHT + 2,
											height: MIDI_V3_NOTE_HEIGHT - 4,
											minWidth: 2,
											background: track.color,
											opacity: isSelected ? 0.88 : 0.16,
											boxShadow: isSelected
												? `inset 0 0 0 1px color-mix(in srgb, ${track.color} 75%, white)`
												: undefined
										}}
									/>
								))}
							</div>
						);
					})}

					<div
						ref={playheadRef}
						className="pointer-events-none absolute top-0 z-30 h-full w-0.5"
						style={{
							background: 'var(--color-error)',
							boxShadow: '0 0 12px color-mix(in srgb, var(--color-error) 60%, transparent)'
						}}
					/>
				</div>
			</div>
		</div>
	);
};
