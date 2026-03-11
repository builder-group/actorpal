import { useFeatureState, useListener } from 'feature-react';
import React from 'react';
import { getMidiNoteName, isMidiBlackKey, isMidiCNote, midiConfig, MidiLayout } from '../lib';
import { useMidiFileCx } from '../MidiFileCx';
import { useMidiViewportCx } from '../MidiViewportCx';
import type { MidiTrack } from '../types';

export const MidiPianoRoll: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const midiViewportCx = useMidiViewportCx();

	// MARK: - State and Memos

	const song = useFeatureState(midiFileCx.$song);
	const selectedTrackId = useFeatureState(midiFileCx.$selectedTrackId);

	const scrollRef = midiViewportCx.scrollContainerRef;
	const innerRef = React.useRef<HTMLDivElement>(null);
	const contentRef = React.useRef<HTMLDivElement>(null);
	const playheadRef = React.useRef<HTMLDivElement>(null);
	const gridRef = React.useRef<HTMLDivElement>(null);

	const layout = React.useMemo(
		() => (song == null ? null : midiViewportCx.getLayout(song)),
		[midiViewportCx, song]
	);

	const contentWidth = layout == null || song == null ? 0 : layout.getContentWidth(song.totalTicks);
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

			midiViewportCx.setScrollPosition(event.currentTarget.scrollLeft, event.currentTarget.scrollTop);
		},
		[midiViewportCx]
	);

	// MARK: - Effects

	React.useEffect(() => {
		const container = scrollRef.current;
		if (container == null) {
			return;
		}

		const observer = new ResizeObserver(() => {
			const rect = container.getBoundingClientRect();
			midiViewportCx.setContainerRect({ width: rect.width, height: rect.height, left: rect.left });

			const currentSong = midiFileCx.$song.get();
			if (currentSong != null) {
				const clampedScrollLeft = midiViewportCx.clampScrollLeft(currentSong, container.scrollLeft);
				if (Math.abs(clampedScrollLeft - container.scrollLeft) > 1) {
					midiViewportCx.syncScroll(currentSong, clampedScrollLeft, container.scrollTop);
				}
			}
		});

		const rect = container.getBoundingClientRect();
		midiViewportCx.setContainerRect({ width: rect.width, height: rect.height, left: rect.left });
		observer.observe(container);
		return () => observer.disconnect();
	}, [midiFileCx, midiViewportCx, scrollRef]);

	useListener(
		midiViewportCx.$pixelsPerBeat,
		({ value }) => {
			const currentSong = midiFileCx.$song.get();
			if (currentSong == null || innerRef.current == null || contentRef.current == null) {
				return;
			}

			const nextLayout = new MidiLayout(value, currentSong.ticksPerBeat);
			const nextContentWidth = nextLayout.getContentWidth(currentSong.totalTicks);
			innerRef.current.style.width = `${nextContentWidth + midiConfig.layout.keyboardWidth}px`;
			contentRef.current.style.width = `${nextContentWidth}px`;

			if (gridRef.current != null) {
				gridRef.current.style.backgroundSize = `${value * 4}px 100%, ${value}px 100%`;
			}
		},
		[midiFileCx, midiViewportCx]
	);

	useListener(
		midiViewportCx.$scrollLeft,
		({ value }) => {
			const container = scrollRef.current;
			if (container == null || Math.abs(container.scrollLeft - value) < 1) {
				return;
			}

			midiViewportCx.isProgrammaticScroll = true;
			container.scrollLeft = value;
			requestAnimationFrame(() => {
				midiViewportCx.isProgrammaticScroll = false;
			});
		},
		[midiViewportCx, scrollRef]
	);

	useListener(
		midiViewportCx.$scrollTop,
		({ value }) => {
			const container = scrollRef.current;
			if (container == null || Math.abs(container.scrollTop - value) < 1) {
				return;
			}

			midiViewportCx.isProgrammaticScroll = true;
			container.scrollTop = value;
			requestAnimationFrame(() => {
				midiViewportCx.isProgrammaticScroll = false;
			});
		},
		[midiViewportCx, scrollRef]
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
			(midiConfig.layout.totalNotes - 1 - midiConfig.layout.defaultScrollNote) * midiConfig.layout.noteHeight -
				container.clientHeight / 2
		);
		midiViewportCx.syncScroll(song, container.scrollLeft, nextScrollTop);
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
				container.getBoundingClientRect().left + midiConfig.layout.keyboardWidth,
				event.deltaY > 0 ? 1 / 1.15 : 1.15
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

			const currentLayout = midiViewportCx.getLayout(currentSong);
			const playheadTick = midiFileCx.$playheadTick.get();
			const playheadX = currentLayout.tickToPx(playheadTick);
			playhead.style.left = `${currentLayout.tickToContentPercent(playheadTick, currentSong.totalTicks)}%`;

			if (!midiFileCx.$isPlaying.get()) {
				return;
			}

			const viewportRight =
				midiViewportCx.$scrollLeft.get() + container.clientWidth - midiConfig.layout.keyboardWidth;
			const margin = container.clientWidth * 0.22;

			if (playheadX < midiViewportCx.$scrollLeft.get() || playheadX > viewportRight - margin) {
				midiViewportCx.syncScroll(currentSong, Math.max(0, playheadX - margin), container.scrollTop);
			}
		};

		updatePlayhead();
		return midiFileCx.$playheadTick.listen(updatePlayhead);
	}, [midiFileCx, midiViewportCx, scrollRef, song]);

	useListener(
		midiViewportCx.$pixelsPerBeat,
		() => {
			const playhead = playheadRef.current;
			const currentSong = midiFileCx.$song.get();
			if (playhead == null || currentSong == null) {
				return;
			}

			const currentLayout = midiViewportCx.getLayout(currentSong);
			const playheadTick = midiFileCx.$playheadTick.get();
			playhead.style.left = `${currentLayout.tickToContentPercent(playheadTick, currentSong.totalTicks)}%`;
		},
		[midiFileCx, midiViewportCx]
	);

	// MARK: - UI

	if (song == null || layout == null) {
		return null;
	}

	return (
		<div ref={scrollRef} className="bg-base-0 min-h-0 flex-1 overflow-auto" onScroll={handleScroll}>
			<div
				ref={innerRef}
				className="relative flex"
				style={{
					width: contentWidth + midiConfig.layout.keyboardWidth,
					height: midiConfig.layout.totalNotes * midiConfig.layout.noteHeight,
				}}
			>
				<MidiKeyboard accentColor={selectedTrack?.color ?? 'var(--color-primary)'} />

				<div ref={contentRef} className="relative" style={{ width: contentWidth }}>
					<LaneBackground />

					<div
						ref={gridRef}
						className="pointer-events-none absolute inset-0"
						style={{
							backgroundImage: [
								'linear-gradient(to right, color-mix(in srgb, var(--color-base-300) 44%, transparent) 1px, transparent 1px)',
								'linear-gradient(to right, color-mix(in srgb, var(--color-base-200) 52%, transparent) 1px, transparent 1px)',
							].join(', '),
							backgroundSize: `${layout.pixelsPerBeat * 4}px 100%, ${layout.pixelsPerBeat}px 100%`,
						}}
					/>

					{song.tracks
						.filter((track) => track.id !== selectedTrackId)
						.map((track) => (
							<TrackNotes key={track.id} isSelected={false} layout={layout} totalTicks={song.totalTicks} track={track} />
						))}
					{song.tracks
						.filter((track) => track.id === selectedTrackId)
						.map((track) => (
							<TrackNotes key={track.id} isSelected={true} layout={layout} totalTicks={song.totalTicks} track={track} />
						))}

					<div
						ref={playheadRef}
						className="pointer-events-none absolute top-0 z-20 h-full w-0.5"
						style={{
							background: 'var(--color-error)',
							boxShadow: '0 0 10px color-mix(in srgb, var(--color-error) 60%, transparent)',
						}}
					/>
				</div>
			</div>
		</div>
	);
};

const LaneBackground: React.FC = React.memo(() => (
	<div className="absolute inset-0">
		{Array.from({ length: midiConfig.layout.totalNotes }, (_, index) => {
			const noteNumber = midiConfig.layout.totalNotes - 1 - index;
			return (
				<div
					key={noteNumber}
					style={{
						height: midiConfig.layout.noteHeight,
						background: isMidiCNote(noteNumber)
							? 'color-mix(in srgb, #f7faff 78%, white)'
							: isMidiBlackKey(noteNumber)
								? 'color-mix(in srgb, var(--color-base-50) 74%, var(--color-base-200))'
								: 'white',
						borderBottom: `1px solid ${
							isMidiCNote(noteNumber)
								? 'var(--color-base-200)'
								: 'color-mix(in srgb, var(--color-base-200) 60%, transparent)'
						}`,
					}}
				/>
			);
		})}
	</div>
));

LaneBackground.displayName = 'LaneBackground';

const MidiKeyboard: React.FC<{ accentColor: string }> = React.memo(({ accentColor }) => (
	<div
		className="border-base-200 sticky left-0 z-10 shrink-0 border-r"
		style={{
			width: midiConfig.layout.keyboardWidth,
			height: midiConfig.layout.totalNotes * midiConfig.layout.noteHeight,
			background: midiConfig.colors.pianoWhite,
		}}
	>
		{Array.from({ length: midiConfig.layout.totalNotes }, (_, index) => {
			const noteNumber = midiConfig.layout.totalNotes - 1 - index;
			const isBlack = isMidiBlackKey(noteNumber);
			const isC = isMidiCNote(noteNumber);

			if (isBlack) {
				return (
					<div key={noteNumber} style={{ position: 'relative', height: midiConfig.layout.noteHeight, background: midiConfig.colors.pianoWhite }}>
						<div
							style={{
								position: 'absolute',
								left: 0,
								top: 1,
								width: Math.round(midiConfig.layout.keyboardWidth * 0.64),
								height: midiConfig.layout.noteHeight - 2,
								background: midiConfig.colors.pianoBlack,
							}}
						/>
						<div
							style={{
								position: 'absolute',
								left: Math.round(midiConfig.layout.keyboardWidth * 0.64),
								top: Math.floor(midiConfig.layout.noteHeight / 2),
								right: 0,
								height: 1,
								background: 'var(--color-base-200)',
							}}
						/>
					</div>
				);
			}

			return (
				<div
					key={noteNumber}
					style={{
						position: 'relative',
						height: midiConfig.layout.noteHeight,
						background: isC ? midiConfig.colors.pianoWhiteC : midiConfig.colors.pianoWhite,
						borderBottom: '1px solid var(--color-base-200)',
					}}
				>
					{isC && (
						<>
							<div
								style={{
									position: 'absolute',
									right: 0,
									top: 0,
									width: 4,
									height: '100%',
									background: accentColor,
								}}
							/>
							<span
								style={{
									position: 'absolute',
									right: 8,
									top: '50%',
									transform: 'translateY(-50%)',
									fontSize: 9,
									fontWeight: 700,
									lineHeight: 1,
									color: accentColor,
									userSelect: 'none',
								}}
							>
								{getMidiNoteName(noteNumber)}
							</span>
						</>
					)}
				</div>
			);
		})}
	</div>
));

MidiKeyboard.displayName = 'MidiKeyboard';

const TrackNotes: React.FC<TTrackNotesProps> = React.memo(({ isSelected, layout, totalTicks, track }) => (
	<div className="pointer-events-none absolute inset-0" style={{ zIndex: isSelected ? 2 : 1 }}>
		{track.notes.map((note) => (
			<div
				key={note.id}
				className="absolute"
				style={{
					left: `${layout.tickToContentPercent(note.tick, totalTicks)}%`,
					width: `${layout.durationToContentPercent(note.durationTicks, totalTicks)}%`,
					top: (midiConfig.layout.totalNotes - 1 - note.noteNumber) * midiConfig.layout.noteHeight + 2,
					height: midiConfig.layout.noteHeight - 4,
					minWidth: 2,
					borderRadius: 4,
					background: track.color,
					opacity: isSelected ? midiConfig.colors.noteSelectedOpacity : midiConfig.colors.noteGhostOpacity,
					boxShadow: isSelected
						? `inset 0 0 0 1px color-mix(in srgb, ${track.color} 72%, white)`
						: undefined,
				}}
			/>
		))}
	</div>
));

TrackNotes.displayName = 'TrackNotes';

interface TTrackNotesProps {
	isSelected: boolean;
	layout: MidiLayout;
	totalTicks: number;
	track: MidiTrack;
}
