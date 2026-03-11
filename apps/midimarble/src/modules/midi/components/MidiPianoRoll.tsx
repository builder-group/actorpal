import { useFeatureState, useListener } from 'feature-react';
import React from 'react';
import { isMidiBlackKey, isMidiCNote, midiConfig, MidiLayout } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';
import type { MidiTrack } from '../types';
import { MidiPianoKeys } from './MidiPianoKeys';

const { defaultScrollNote, keyboardWidth, noteHeight, totalNotes } = midiConfig.layout;
const totalHeight = totalNotes * noteHeight;

export const MidiPianoRoll: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	const song = useFeatureState(midiFileCx.$song);
	const selectedTrackId = useFeatureState(midiFileCx.$selectedTrackId);

	const scrollRef = midiViewportCx.scrollContainerRef;
	const innerRef = React.useRef<HTMLDivElement>(null);
	const gridRef = React.useRef<HTMLDivElement>(null);
	const playheadRef = React.useRef<HTMLDivElement>(null);

	const layout = React.useMemo(
		() => (song == null ? null : midiViewportCx.getLayout(song)),
		[midiViewportCx, song]
	);

	const notesWidth = layout == null || song == null ? 0 : layout.notesWidth(song.totalTicks);
	const endPadding = layout?.endPadding() ?? 0;
	const selectedTrack = React.useMemo(
		() => song?.tracks.find((track) => track.id === selectedTrackId) ?? song?.tracks[0] ?? null,
		[selectedTrackId, song]
	);

	// MARK: - Actions

	const handleScroll = React.useCallback(
		(event: React.UIEvent<HTMLDivElement>) => {
			if (midiViewportCx.isProgrammaticScroll) {
				return;
			}

			midiViewportCx.setScrollPosition(
				event.currentTarget.scrollLeft,
				event.currentTarget.scrollTop
			);
		},
		[midiViewportCx]
	);

	// MARK: - Effects

	React.useEffect(() => {
		const container = scrollRef.current;
		if (container == null) {
			return;
		}

		const updateContainerRect = () => {
			const rect = container.getBoundingClientRect();
			midiViewportCx.setContainerRect({ width: rect.width, height: rect.height, left: rect.left });
		};

		const observer = new ResizeObserver(() => {
			updateContainerRect();

			const currentSong = midiFileCx.$song.get();
			if (currentSong == null) {
				return;
			}

			const nextScrollLeft = midiViewportCx.clampScrollLeft(currentSong, container.scrollLeft);
			if (Math.abs(nextScrollLeft - container.scrollLeft) > 1) {
				midiViewportCx.syncScroll(currentSong, nextScrollLeft, container.scrollTop);
			}
		});

		updateContainerRect();
		observer.observe(container);
		return () => observer.disconnect();
	}, [midiFileCx, midiViewportCx, scrollRef]);

	useListener(
		midiViewportCx.$pixelsPerBeat,
		({ value }) => {
			const currentSong = midiFileCx.$song.get();
			const container = scrollRef.current;
			if (currentSong == null || innerRef.current == null) {
				return;
			}

			const nextLayout = new MidiLayout(value, currentSong.ticksPerBeat);
			innerRef.current.style.width = `${keyboardWidth + nextLayout.notesWidth(currentSong.totalTicks)}px`;
			innerRef.current.style.paddingRight = `${nextLayout.endPadding()}px`;

			if (gridRef.current != null) {
				gridRef.current.style.backgroundSize = `${value * 4}px 100%, ${value}px 100%`;
			}

			if (container == null) {
				return;
			}

			const nextScrollLeft = midiViewportCx.clampScrollLeft(
				currentSong,
				container.scrollLeft,
				value
			);
			if (Math.abs(nextScrollLeft - container.scrollLeft) > 1) {
				midiViewportCx.syncScroll(currentSong, nextScrollLeft, container.scrollTop);
			}
		},
		[midiFileCx, midiViewportCx, scrollRef]
	);

	React.useEffect(() => {
		if (song == null) {
			return;
		}

		const container = scrollRef.current;
		if (container == null) {
			return;
		}

		const nextScrollTop = Math.max(
			0,
			(totalNotes - 1 - defaultScrollNote) * noteHeight - container.clientHeight / 2
		);
		midiViewportCx.syncScroll(song, 0, nextScrollTop);
	}, [midiViewportCx, scrollRef, song]);

	React.useEffect(() => {
		const container = scrollRef.current;
		if (container == null) {
			return;
		}

		const handleWheel = (event: WheelEvent) => {
			if (!event.ctrlKey && !event.metaKey) {
				return;
			}

			const currentSong = midiFileCx.$song.get();
			if (currentSong == null) {
				return;
			}

			event.preventDefault();
			midiViewportCx.zoomAtClientX(
				currentSong,
				event.clientX,
				container.getBoundingClientRect().left + keyboardWidth,
				event.deltaY > 0 ? 1 / midiConfig.zoom.wheelFactor : midiConfig.zoom.wheelFactor
			);
		};

		container.addEventListener('wheel', handleWheel, { passive: false });
		return () => container.removeEventListener('wheel', handleWheel);
	}, [midiFileCx, midiViewportCx, scrollRef]);

	React.useEffect(() => {
		if (song == null) {
			return;
		}

		const updatePlayhead = () => {
			const playhead = playheadRef.current;
			const container = scrollRef.current;
			const currentSong = midiFileCx.$song.get();
			if (playhead == null || container == null || currentSong == null) {
				return;
			}

			const playheadTick = midiFileCx.$playheadTick.get();
			playhead.style.left = `${(playheadTick / Math.max(1, currentSong.totalTicks)) * 100}%`;

			if (!midiFileCx.$isPlaying.get()) {
				return;
			}

			const currentLayout = midiViewportCx.getLayout(currentSong);
			const playheadX = currentLayout.tickToPx(playheadTick);
			const viewportRight =
				midiViewportCx.$scrollLeft.get() + container.clientWidth - keyboardWidth;
			const margin = container.clientWidth * 0.22;

			if (playheadX < midiViewportCx.$scrollLeft.get() || playheadX > viewportRight - margin) {
				midiViewportCx.syncScroll(
					currentSong,
					Math.max(0, playheadX - margin),
					container.scrollTop
				);
			}
		};

		updatePlayhead();
		return midiFileCx.$playheadTick.listen(updatePlayhead);
	}, [midiFileCx, midiViewportCx, scrollRef, song]);

	// MARK: - UI

	if (song == null || layout == null) {
		return null;
	}

	return (
		<div ref={scrollRef} className="bg-base-0 min-h-0 flex-1 overflow-auto" onScroll={handleScroll}>
			<div
				ref={innerRef}
				className="flex"
				style={{
					width: keyboardWidth + notesWidth,
					paddingRight: endPadding,
					height: totalHeight
				}}
			>
				<MidiPianoKeys accentColor={selectedTrack?.color ?? 'var(--color-primary)'} />

				<div className="relative flex-1">
					<LaneBackground />
					<GridLines pixelsPerBeat={layout.pixelsPerBeat} ref={gridRef} />

					{song.tracks
						.filter((track) => track.id !== selectedTrackId)
						.map((track) => (
							<TrackNotes
								key={track.id}
								isSelected={false}
								totalTicks={song.totalTicks}
								track={track}
							/>
						))}

					{song.tracks
						.filter((track) => track.id === selectedTrackId)
						.map((track) => (
							<TrackNotes
								key={track.id}
								isSelected={true}
								totalTicks={song.totalTicks}
								track={track}
							/>
						))}

					<div
						ref={playheadRef}
						className="bg-error pointer-events-none absolute top-0 z-20 h-full w-0.5"
						style={{
							left: 0,
							boxShadow: '0 0 10px color-mix(in srgb, var(--color-error) 60%, transparent)'
						}}
					/>
				</div>
			</div>
		</div>
	);
};

const LaneBackground: React.FC = React.memo(() => (
	<div className="absolute inset-0">
		{Array.from({ length: totalNotes }, (_, index) => {
			const noteNumber = totalNotes - 1 - index;
			return (
				<div
					key={noteNumber}
					style={{
						height: noteHeight,
						background: isMidiCNote(noteNumber)
							? 'color-mix(in srgb, #edf2ff 60%, white)'
							: isMidiBlackKey(noteNumber)
								? 'color-mix(in srgb, var(--color-base-50) 72%, var(--color-base-200))'
								: midiConfig.colors.pianoWhite,
						borderBottom: `1px solid ${isMidiCNote(noteNumber) ? 'var(--color-base-200)' : 'color-mix(in srgb, var(--color-base-200) 45%, transparent)'}`
					}}
				/>
			);
		})}
	</div>
));

LaneBackground.displayName = 'LaneBackground';

const GridLines = React.forwardRef<HTMLDivElement, TGridLinesProps>(({ pixelsPerBeat }, ref) => (
	<div
		ref={ref}
		className="pointer-events-none absolute inset-0"
		style={{
			backgroundImage: [
				'linear-gradient(to right, var(--color-base-200) 1px, transparent 1px)',
				'linear-gradient(to right, color-mix(in srgb, var(--color-base-200) 50%, transparent) 1px, transparent 1px)'
			].join(', '),
			backgroundSize: `${pixelsPerBeat * 4}px 100%, ${pixelsPerBeat}px 100%`
		}}
	/>
));

GridLines.displayName = 'GridLines';

const TrackNotes: React.FC<TTrackNotesProps> = React.memo(({ isSelected, totalTicks, track }) => (
	<div className="pointer-events-none absolute inset-0" style={{ zIndex: isSelected ? 2 : 1 }}>
		{track.notes.map((note) => (
			<div
				key={note.id}
				className="absolute"
				style={{
					left: `${(note.tick / Math.max(1, totalTicks)) * 100}%`,
					width: `${(note.durationTicks / Math.max(1, totalTicks)) * 100}%`,
					top: (totalNotes - 1 - note.noteNumber) * noteHeight + 2,
					height: noteHeight - 4,
					minWidth: 2,
					borderRadius: 4,
					background: track.color,
					opacity: isSelected
						? midiConfig.colors.noteSelectedOpacity
						: midiConfig.colors.noteGhostOpacity,
					boxShadow: isSelected
						? `inset 0 0 0 1px color-mix(in srgb, ${track.color} 72%, white)`
						: undefined
				}}
			/>
		))}
	</div>
));

TrackNotes.displayName = 'TrackNotes';

interface TGridLinesProps {
	pixelsPerBeat: number;
}

interface TTrackNotesProps {
	isSelected: boolean;
	totalTicks: number;
	track: MidiTrack;
}
