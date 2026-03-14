import React from 'react';
import { Entity, With } from 'ecsify';
import { useMemoCleanup } from '@/hooks';
import { useQueryComponents, useResource } from '@/modules/engine';
import { clampMidiTick, findTrackById, stepToTick } from '@/modules/engine/plugins/midi';
import { useEditorCx } from '../EditorCx';
import {
	buildNoteRows,
	getNoteName,
	MIN_ROLL_HEIGHT,
	NOTE_ROW_HEIGHT,
	ZOOM_STEP_FACTOR
} from '../lib/timeline-layout';
import { TimelineCx, useTimelineState } from './timeline/TimelineCx';
import { TimelineHeader } from './timeline/TimelineHeader';
import { TimelineRoll } from './timeline/TimelineRoll';

const TimelineEmptyState: React.FC<{ message: string }> = ({ message }) => (
	<div className="border-base-200 bg-base-0 flex h-full min-h-0 flex-1 items-center justify-center border-t">
		<p className="text-base-500 max-w-sm px-6 text-center text-sm">{message}</p>
	</div>
);

export const Timeline: React.FC<{ className?: string }> = ({ className }) => {
	const cx = useEditorCx();
	const app = cx.runtime.app;
	const timelineCx = useMemoCleanup(() => {
		const nextTimelineCx = new TimelineCx();
		return [nextTimelineCx, () => nextTimelineCx.unmount()];
	}, []);

	const isReady = useResource(app, 'isReady');
	const midiSong = useResource(app, 'midiSong');
	const selectedTrackId = useResource(app, 'selectedTrackId');
	const midiImportError = useResource(app, 'midiImportError');
	const selectedNoteId = useResource(app, 'selectedNoteId');
	const transport = useResource(app, 'transport');
	const liveStep = useResource(app, 'liveStep');
	const bufferedStep = useResource(app, 'bufferedStep');
	const simulationSync = useResource(app, 'simulationSync');
	const fixedTimeStepSeconds = useResource(app, 'fixedTimeStepSeconds');
	const notePlatforms = useQueryComponents(app, {
		components: [Entity, app.c.NoteBindingMixin] as const,
		queryOrFilter: With(app.c.NotePlatformMixin),
		watchComponents: [app.c.NoteBindingMixin, app.c.NotePlatformMixin]
	});

	const containerWidth = useTimelineState(timelineCx.$containerWidth);
	const pixelsPerBeat = useTimelineState(timelineCx.$pixelsPerBeat);

	const selectedTrack = React.useMemo(
		() => findTrackById(midiSong, selectedTrackId),
		[midiSong, selectedTrackId]
	);
	const canControlPlayback =
		isReady && midiSong != null && selectedTrack != null && midiSong.totalTicks > 0;

	const pixelsPerTick = timelineCx.getPixelsPerTick(midiSong);
	const playheadTick =
		midiSong == null ? 0 : clampMidiTick(transport.playheadTick, midiSong.totalTicks);
	const bufferedTick =
		midiSong == null
			? 0
			: Math.min(stepToTick(bufferedStep, midiSong, fixedTimeStepSeconds), midiSong.totalTicks);
	const preloadedSteps = Math.max(0, bufferedStep - liveStep);
	const preloadedLabel =
		simulationSync.mode === 'dirty'
			? 'Preloaded Pending'
			: simulationSync.mode === 'rebuilding'
				? 'Preloaded Recomputing'
				: `Preloaded ${preloadedSteps}`;
	const playheadPx = playheadTick * pixelsPerTick;
	const bufferedPx = bufferedTick * pixelsPerTick;
	const noteRows = React.useMemo(() => buildNoteRows(selectedTrack?.notes ?? []), [selectedTrack]);
	const selectedNote = React.useMemo(
		() => selectedTrack?.notes.find((note) => note.id === selectedNoteId) ?? null,
		[selectedNoteId, selectedTrack]
	);
	const selectedNoteLabel =
		selectedNote == null
			? null
				: `${getNoteName(selectedNote.noteNumber)} @ ${Math.round(selectedNote.tick)}`;
	const placedNoteIds = React.useMemo(
		() => new Set(notePlatforms.map(([, binding]) => binding.noteId)),
		[notePlatforms]
	);
	const contentHeight = Math.max(noteRows.length * NOTE_ROW_HEIGHT, MIN_ROLL_HEIGHT);
	const timelineWidth =
		midiSong == null ? Math.max(containerWidth, 1) : timelineCx.getTimelineWidth(midiSong);
	const zoomLabel = `${timelineCx.getZoomRatio().toFixed(2)}x`;

	const [isDragging, setIsDragging] = React.useState(false);
	const [isImporting, setIsImporting] = React.useState(false);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		const scrollContainer = timelineCx.scrollContainerRef.current;
		if (scrollContainer == null) {
			return;
		}

		const syncContainerWidth = () => {
			timelineCx.setContainerWidth(scrollContainer.clientWidth);
			if (midiSong == null) {
				scrollContainer.scrollLeft = 0;
				return;
			}

			timelineCx.syncViewport(midiSong, scrollContainer.scrollLeft, pixelsPerBeat);
		};

		syncContainerWidth();
		const observer = new ResizeObserver(syncContainerWidth);
		observer.observe(scrollContainer);

		return () => {
			observer.disconnect();
		};
	}, [midiSong, pixelsPerBeat, timelineCx]);

	const seekFromClientX = React.useCallback(
		(clientX: number) => {
			if (!canControlPlayback || midiSong == null) {
				return;
			}

			cx.runtime.seekToTick(timelineCx.getTickAtClientX(midiSong, clientX));
		},
		[canControlPlayback, cx.runtime, midiSong, timelineCx]
	);

	const handlePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!canControlPlayback) {
				return;
			}

			event.currentTarget.setPointerCapture(event.pointerId);
			setIsDragging(true);
			seekFromClientX(event.clientX);
		},
		[canControlPlayback, seekFromClientX]
	);

	const handlePointerMove = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!isDragging) {
				return;
			}

			seekFromClientX(event.clientX);
		},
		[isDragging, seekFromClientX]
	);

	const handlePointerUp = React.useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleWheel = React.useCallback(
		(event: React.WheelEvent<HTMLDivElement>) => {
			if (midiSong == null || (!event.ctrlKey && !event.metaKey)) {
				return;
			}

			event.preventDefault();
			timelineCx.zoomAtClientX(
				midiSong,
				event.clientX,
				event.deltaY > 0 ? 1 / ZOOM_STEP_FACTOR : ZOOM_STEP_FACTOR
			);
		},
		[midiSong, timelineCx]
	);

	const openMidiPicker = React.useCallback(() => {
		if (!isImporting) {
			fileInputRef.current?.click();
		}
	}, [isImporting]);

	const handleMidiFileChange = React.useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			event.target.value = '';
			if (file == null) {
				return;
			}

			setIsImporting(true);
			try {
				await cx.runtime.loadMidiFile(file);
			} finally {
				setIsImporting(false);
			}
		},
		[cx.runtime]
	);

	const handleZoomIn = React.useCallback(() => {
		if (midiSong != null) {
			timelineCx.zoomIn(midiSong);
		}
	}, [midiSong, timelineCx]);

	const handleZoomOut = React.useCallback(() => {
		if (midiSong != null) {
			timelineCx.zoomOut(midiSong);
		}
	}, [midiSong, timelineCx]);

	const emptyStateMessage =
		midiSong == null
			? 'Open a MIDI file to set the song length, beat ruler, and note lanes.'
			: selectedTrack == null
				? 'The imported MIDI file does not contain a playable note track yet.'
				: null;

	return (
		<section
			className={['bg-base-0 flex h-full flex-col overflow-hidden', className]
				.filter(Boolean)
				.join(' ')}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept=".mid,.midi,audio/midi,audio/x-midi"
				className="hidden"
				onChange={handleMidiFileChange}
			/>

			<TimelineHeader
				canControlPlayback={canControlPlayback && !isImporting}
				canZoom={midiSong != null && midiSong.totalTicks > 0}
				isImporting={isImporting}
				importLabel={isImporting ? 'Importing…' : 'Open MIDI'}
				importError={midiImportError}
				mode={transport.mode}
				trackName={selectedTrack?.name ?? null}
				bpm={midiSong?.bpm ?? null}
				playheadTick={playheadTick}
				liveStep={liveStep}
				preloadedLabel={preloadedLabel}
				selectedNoteLabel={selectedNoteLabel}
				zoomLabel={zoomLabel}
				onOpenMidi={openMidiPicker}
				onStepBackwardTick={() => cx.runtime.stepBackwardTick()}
				onStepForwardTick={() => cx.runtime.stepForwardTick()}
				onPlay={() => cx.runtime.run()}
				onPause={() => cx.runtime.pause()}
				onReset={() => cx.runtime.reset()}
				onZoomOut={handleZoomOut}
				onZoomIn={handleZoomIn}
			/>

			{emptyStateMessage != null || midiSong == null ? (
				<TimelineEmptyState message={emptyStateMessage ?? 'Open a MIDI file to begin.'} />
			) : (
				<div
					ref={timelineCx.scrollContainerRef}
					className="min-h-0 flex-1 overflow-auto"
					onWheel={handleWheel}
				>
					<TimelineRoll
						timelineWidth={timelineWidth}
						totalTicks={midiSong.totalTicks}
						ticksPerBeat={midiSong.ticksPerBeat}
						pixelsPerTick={pixelsPerTick}
						bufferedPx={bufferedPx}
						playheadPx={playheadPx}
						contentHeight={contentHeight}
						noteRows={noteRows}
							notes={selectedTrack?.notes ?? []}
							selectedNoteId={selectedNoteId}
							placedNoteIds={placedNoteIds}
							canScrub={canControlPlayback}
						isDragging={isDragging}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						onSelectNote={(noteId, tick) => cx.runtime.selectNote(noteId, tick)}
					/>
				</div>
			)}
		</section>
	);
};
