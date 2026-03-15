import { Entity, With } from 'ecsify';
import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { useQueryComponents, useResource } from '@/modules/engine';
import {
	clampMidiTick,
	findTrackById,
	stepToTick,
	type TMidiNote
} from '@/modules/engine/plugins/midi';
import { isNotePlatformAdjusted } from '@/modules/engine/plugins/scene/lib/note-platform';
import { useEditorCx } from '../EditorCx';
import {
	buildDrawnTimelineNote,
	buildMovedTimelineNotes,
	buildResizedTimelineNote,
	getSnappedMoveDeltaTick,
	getSnappedTimelineTick,
	type TTimelineEditableNote
} from '../lib/timeline-editing';
import {
	buildNoteRows,
	getNoteName,
	MIN_ROLL_HEIGHT,
	NOTE_ROW_HEIGHT,
	ZOOM_STEP_FACTOR
} from '../lib/timeline-layout';
import {
	TimelineCx,
	useTimelineState,
	type TTimelineInteractionState
} from './timeline/TimelineCx';
import { TimelineHeader } from './timeline/TimelineHeader';
import {
	TimelineRoll,
	type TTimelineDraftNote,
	type TTimelineGridPointerInput,
	type TTimelineNotePointerInput
} from './timeline/TimelineRoll';

const TimelineEmptyState: React.FC<{ message: string }> = ({ message }) => (
	<div className="border-base-200 bg-base-0 flex h-full min-h-0 flex-1 items-center justify-center border-t">
		<p className="text-base-500 max-w-sm px-6 text-center text-sm">{message}</p>
	</div>
);

const POINTER_DRAG_THRESHOLD_PX = 4;
const TIMELINE_SNAP_THRESHOLD_PX = 8;

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
	const selectedNoteIds = useResource(app, 'selectedNoteIds');
	const audioPlaybackFeedback = useResource(app, 'audioPlaybackFeedback');
	const transport = useResource(app, 'transport');
	const previewConfig = useResource(app, 'previewConfig');
	const liveStep = useResource(app, 'liveStep');
	const bufferedStep = useResource(app, 'bufferedStep');
	const simulationSync = useResource(app, 'simulationSync');
	const sceneEditState = useResource(app, 'sceneEditState');
	const fixedTimeStepSeconds = useResource(app, 'fixedTimeStepSeconds');
	const notePlatforms = useQueryComponents(app, {
		components: [Entity, app.c.NoteBindingMixin, app.c.NotePlatformMixin] as const,
		queryOrFilter: With(app.c.NotePlatformMixin),
		watchComponents: [app.c.NoteBindingMixin, app.c.NotePlatformMixin]
	});

	const containerWidth = useTimelineState(timelineCx.$containerWidth);
	const pixelsPerBeat = useTimelineState(timelineCx.$pixelsPerBeat);
	const keyboardMode = useTimelineState(timelineCx.$keyboardMode);
	const interactionState = useTimelineState(timelineCx.$interactionState);

	const selectedTrack = React.useMemo(
		() => findTrackById(midiSong, selectedTrackId),
		[midiSong, selectedTrackId]
	);
	const canControlPlayback =
		isReady && midiSong != null && selectedTrack != null && midiSong.totalTicks > 0;
	const canEditNotes =
		midiSong != null &&
		selectedTrack != null &&
		simulationSync.mode === 'idle' &&
		!sceneEditState.pending;

	const pixelsPerTick = timelineCx.getPixelsPerTick(midiSong);
	const playheadTick =
		midiSong == null ? 0 : clampMidiTick(transport.playheadTick, midiSong.totalTicks);
	const bufferedTick =
		midiSong == null
			? 0
			: Math.min(stepToTick(bufferedStep, midiSong, fixedTimeStepSeconds), midiSong.totalTicks);
	const hasPendingFuture = sceneEditState.pending || simulationSync.mode !== 'idle';
	const visibleBufferedTick = hasPendingFuture ? 0 : bufferedTick;
	const preloadedSteps = Math.max(0, bufferedStep - liveStep);
	const preloadedLabel =
		sceneEditState.pending || simulationSync.mode === 'dirty'
			? 'Preloaded Pending'
			: simulationSync.mode === 'rebuilding'
				? 'Preloaded Recomputing'
				: `Preloaded ${preloadedSteps}`;
	const playheadPx = playheadTick * pixelsPerTick;
	const bufferedPx = visibleBufferedTick * pixelsPerTick;
	const draftNotes = React.useMemo(
		() => buildDraftTimelineNotes(interactionState, midiSong?.ticksPerBeat ?? 480),
		[interactionState, midiSong?.ticksPerBeat]
	);
	const noteRows = React.useMemo(
		() =>
			buildNoteRows(
				selectedTrack?.notes ?? [],
				draftNotes.map((note) => note.noteNumber),
				keyboardMode
			),
		[draftNotes, keyboardMode, selectedTrack]
	);
	const selectedNote = React.useMemo(
		() => selectedTrack?.notes.find((note) => note.id === selectedNoteId) ?? null,
		[selectedNoteId, selectedTrack]
	);
	const selectedNoteLabel =
		selectedNoteIds.size > 1
			? `${selectedNoteIds.size} selected`
			: selectedNote == null
				? null
				: `${getNoteName(selectedNote.noteNumber)} @ ${Math.round(selectedNote.tick)}`;
	const placedNoteIds = React.useMemo(
		() => new Set(notePlatforms.map(([, binding]) => binding.noteId)),
		[notePlatforms]
	);
	const adjustedNoteIds = React.useMemo(
		() =>
			new Set(
				notePlatforms.flatMap(([, binding, platform]) =>
					isNotePlatformAdjusted(platform) ? [binding.noteId] : []
				)
			),
		[notePlatforms]
	);
	const contentHeight = Math.max(noteRows.length * NOTE_ROW_HEIGHT, MIN_ROLL_HEIGHT);
	const timelineWidth =
		midiSong == null ? Math.max(containerWidth, 1) : timelineCx.getTimelineWidth(midiSong);

	const [isRulerDragging, setIsRulerDragging] = React.useState(false);
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

	const handleRulerPointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!canControlPlayback) {
				return;
			}

			event.currentTarget.setPointerCapture(event.pointerId);
			setIsRulerDragging(true);
			seekFromClientX(event.clientX);
		},
		[canControlPlayback, seekFromClientX]
	);

	const handleRulerPointerMove = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!isRulerDragging) {
				return;
			}

			seekFromClientX(event.clientX);
		},
		[isRulerDragging, seekFromClientX]
	);

	const handleRulerPointerUp = React.useCallback(() => {
		setIsRulerDragging(false);
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

	const handleNoteSelection = React.useCallback(
		(noteId: number, additive: boolean) => {
			if (!additive) {
				cx.runtime.selectNotes([noteId], noteId);
				return;
			}

			const nextSelectedNoteIds = new Set(selectedNoteIds);
			if (nextSelectedNoteIds.has(noteId)) {
				nextSelectedNoteIds.delete(noteId);
			} else {
				nextSelectedNoteIds.add(noteId);
			}
			const nextNoteIds = Array.from(nextSelectedNoteIds);
			const nextPrimaryNoteId =
				nextNoteIds.length === 0
					? null
					: selectedNoteId != null && nextSelectedNoteIds.has(selectedNoteId)
						? selectedNoteId
						: noteId;
			cx.runtime.selectNotes(nextNoteIds, nextPrimaryNoteId);
		},
		[cx.runtime, selectedNoteId, selectedNoteIds]
	);

	const handleGridPointerDown = React.useCallback(
		(input: TTimelineGridPointerInput) => {
			if (!canEditNotes) {
				return;
			}

			const anchorTick = getSnappedTimelineTick(
				input.tick,
				midiSong?.ticksPerBeat ?? 0,
				pixelsPerTick,
				TIMELINE_SNAP_THRESHOLD_PX
			);

			timelineCx.setInteractionState({
				mode: 'drawing',
				pointerId: input.pointerId,
				anchorTick,
				currentTick: anchorTick,
				noteNumber: input.noteNumber,
				didDrag: false,
				pointerDownClient: { x: input.clientX, y: input.clientY }
			});
		},
		[canEditNotes, midiSong?.ticksPerBeat, pixelsPerTick, timelineCx]
	);

	const handleGridPointerMove = React.useCallback(
		(input: TTimelineGridPointerInput) => {
			const currentInteractionState = timelineCx.$interactionState.get();
			if (
				currentInteractionState.mode === 'idle' ||
				currentInteractionState.pointerId !== input.pointerId
			) {
				return;
			}

			if (currentInteractionState.mode === 'drawing') {
				const currentTick = getSnappedTimelineTick(
					input.tick,
					midiSong?.ticksPerBeat ?? 0,
					pixelsPerTick,
					TIMELINE_SNAP_THRESHOLD_PX
				);
				const didDrag =
					currentInteractionState.didDrag ||
					Math.abs(input.clientX - currentInteractionState.pointerDownClient.x) >
						POINTER_DRAG_THRESHOLD_PX ||
					Math.abs(input.clientY - currentInteractionState.pointerDownClient.y) >
						POINTER_DRAG_THRESHOLD_PX;
				if (didDrag && !currentInteractionState.didDrag && transport.mode === 'running') {
					cx.runtime.pause();
				}

				timelineCx.setInteractionState({
					...currentInteractionState,
					currentTick,
					didDrag
				});
				return;
			}

			if (currentInteractionState.mode === 'moving') {
				const snappedDeltaTick = getSnappedMoveDeltaTick(
					currentInteractionState.clickedNote.tick,
					input.tick - currentInteractionState.anchorTick,
					midiSong?.ticksPerBeat ?? 0,
					pixelsPerTick,
					TIMELINE_SNAP_THRESHOLD_PX
				);
				const didDrag =
					currentInteractionState.didDrag ||
					Math.abs(input.clientX - currentInteractionState.pointerDownClient.x) >
						POINTER_DRAG_THRESHOLD_PX ||
					Math.abs(input.clientY - currentInteractionState.pointerDownClient.y) >
						POINTER_DRAG_THRESHOLD_PX;
				if (didDrag && !currentInteractionState.didDrag && transport.mode === 'running') {
					cx.runtime.pause();
				}

				timelineCx.setInteractionState({
					...currentInteractionState,
					currentTick: currentInteractionState.anchorTick + snappedDeltaTick,
					currentNoteNumber: input.noteNumber,
					didDrag
				});
				return;
			}

			const currentTick = getSnappedTimelineTick(
				input.tick,
				midiSong?.ticksPerBeat ?? 0,
				pixelsPerTick,
				TIMELINE_SNAP_THRESHOLD_PX
			);
			timelineCx.setInteractionState({
				...currentInteractionState,
				currentTick
			});
		},
		[cx.runtime, midiSong?.ticksPerBeat, pixelsPerTick, timelineCx, transport.mode]
	);

	const handleGridPointerUp = React.useCallback(() => {
		const currentInteractionState = timelineCx.$interactionState.get();
		if (currentInteractionState.mode === 'idle') {
			return;
		}

		if (currentInteractionState.mode === 'drawing') {
			if (!currentInteractionState.didDrag) {
				cx.runtime.clearNoteSelection();
			} else if (midiSong != null) {
				const draftNote = buildDrawnTimelineNote(
					currentInteractionState.noteNumber,
					currentInteractionState.anchorTick,
					currentInteractionState.currentTick,
					midiSong.ticksPerBeat
				);
				cx.runtime.createNote(draftNote);
			}
			timelineCx.clearInteractionState();
			return;
		}

		if (currentInteractionState.mode === 'moving') {
			if (!currentInteractionState.didDrag) {
				cx.runtime.selectNote(
					currentInteractionState.clickedNote.id,
					currentInteractionState.clickedNote.tick
				);
				timelineCx.clearInteractionState();
				return;
			}

			cx.runtime.moveSelectedNotes(
				currentInteractionState.currentTick - currentInteractionState.anchorTick,
				currentInteractionState.currentNoteNumber - currentInteractionState.anchorNoteNumber
			);
			timelineCx.clearInteractionState();
			return;
		}

		if (
			Math.round(currentInteractionState.currentTick - currentInteractionState.anchorTick) === 0
		) {
			timelineCx.clearInteractionState();
			return;
		}

		cx.runtime.resizePrimarySelectedNote(
			currentInteractionState.mode === 'resizing-start' ? 'start' : 'end',
			currentInteractionState.currentTick - currentInteractionState.anchorTick
		);
		timelineCx.clearInteractionState();
	}, [cx.runtime, midiSong, timelineCx, transport.mode]);

	const handleNotePointerDown = React.useCallback(
		(input: TTimelineNotePointerInput) => {
			handleNoteSelection(input.note.id, input.additive);
			if (input.additive || !canEditNotes || selectedTrack == null) {
				return;
			}

			const selectedNotes =
				input.edge === 'body' && selectedNoteIds.has(input.note.id) && selectedNoteIds.size > 0
					? selectedTrack.notes.filter((note) => selectedNoteIds.has(note.id))
					: [input.note];

			if (input.edge !== 'body' && selectedNotes.length === 1) {
				if (transport.mode === 'running') {
					cx.runtime.pause();
				}

				timelineCx.setInteractionState({
					mode: input.edge === 'start' ? 'resizing-start' : 'resizing-end',
					pointerId: input.pointerId,
					anchorTick:
						input.edge === 'start' ? input.note.tick : input.note.tick + input.note.durationTicks,
					currentTick: input.tick,
					note: toEditableTimelineNote(input.note)
				});
				return;
			}

			timelineCx.setInteractionState({
				mode: 'moving',
				pointerId: input.pointerId,
				anchorTick: input.tick,
				currentTick: input.tick,
				anchorNoteNumber: input.noteNumber,
				currentNoteNumber: input.noteNumber,
				didDrag: false,
				pointerDownClient: { x: input.clientX, y: input.clientY },
				clickedNote: toEditableTimelineNote(input.note),
				notes: selectedNotes.map((note) => toEditableTimelineNote(note))
			});
		},
		[
			canEditNotes,
			cx.runtime,
			handleNoteSelection,
			selectedNoteIds,
			selectedTrack,
			timelineCx,
			transport.mode
		]
	);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (event.key === 'Escape') {
				timelineCx.clearInteractionState();
				return;
			}

			if (
				selectedTrack != null &&
				(event.metaKey || event.ctrlKey) &&
				event.key.toLowerCase() === 'a'
			) {
				event.preventDefault();
				cx.runtime.selectAllTrackNotes(selectedTrack.id);
				return;
			}

			if (event.key === 'Delete' || event.key === 'Backspace') {
				event.preventDefault();
				cx.runtime.deleteSelectedNotes();
			}
		},
		[cx.runtime, selectedTrack, timelineCx]
	);

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
				canEditNotes={midiSong != null && selectedTrack != null}
				canZoom={midiSong != null && midiSong.totalTicks > 0}
				isImporting={isImporting}
				importLabel={isImporting ? 'Importing…' : 'Open MIDI'}
				importError={midiImportError}
				mode={transport.mode}
				previewEnabled={previewConfig.enabled}
				trackName={selectedTrack?.name ?? null}
				bpm={midiSong?.bpm ?? null}
				playheadTick={playheadTick}
				liveStep={liveStep}
				preloadedLabel={preloadedLabel}
				selectedNoteLabel={selectedNoteLabel}
				keyboardMode={keyboardMode}
				onOpenMidi={openMidiPicker}
				onSetKeyboardMode={(mode) => timelineCx.setKeyboardMode(mode)}
				onStepBackwardTick={() => cx.runtime.stepBackwardTick()}
				onStepForwardTick={() => cx.runtime.stepForwardTick()}
				onPlay={() => cx.runtime.run()}
				onPause={() => cx.runtime.pause()}
				onReset={() => cx.runtime.reset()}
				onTogglePreview={() => cx.runtime.togglePreview()}
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
						draftNotes={draftNotes}
						selectedNoteId={selectedNoteId}
						selectedNoteIds={selectedNoteIds}
						activeNoteIds={audioPlaybackFeedback.activeNoteIds}
						activeNoteNumbers={audioPlaybackFeedback.activeNoteNumbers}
						placedNoteIds={placedNoteIds}
						adjustedNoteIds={adjustedNoteIds}
						canScrub={canControlPlayback}
						canEditNotes={canEditNotes}
						isRulerDragging={isRulerDragging}
						onRulerPointerDown={handleRulerPointerDown}
						onRulerPointerMove={handleRulerPointerMove}
						onRulerPointerUp={handleRulerPointerUp}
						onGridPointerDown={handleGridPointerDown}
						onGridPointerMove={handleGridPointerMove}
						onGridPointerUp={handleGridPointerUp}
						onNotePointerDown={handleNotePointerDown}
						onKeyDown={handleKeyDown}
					/>
				</div>
			)}
		</section>
	);
};

function buildDraftTimelineNotes(
	interactionState: TTimelineInteractionState,
	defaultDurationTicks: number
): TTimelineDraftNote[] {
	if (interactionState.mode === 'idle') {
		return [];
	}

	if (interactionState.mode === 'drawing') {
		if (!interactionState.didDrag) {
			return [];
		}

		const note = buildDrawnTimelineNote(
			interactionState.noteNumber,
			interactionState.anchorTick,
			interactionState.currentTick,
			defaultDurationTicks
		);
		return [
			{
				id: -1,
				sourceId: null,
				velocity: 100,
				...note
			}
		];
	}

	if (interactionState.mode === 'moving') {
		return buildMovedTimelineNotes(
			interactionState.notes,
			interactionState.currentTick - interactionState.anchorTick,
			interactionState.currentNoteNumber - interactionState.anchorNoteNumber
		).map((note) => ({
			...note,
			sourceId: note.id
		}));
	}

	const resizedNote = buildResizedTimelineNote(
		interactionState.note,
		interactionState.mode === 'resizing-start' ? 'start' : 'end',
		interactionState.currentTick - interactionState.anchorTick
	);

	return [
		{
			...resizedNote,
			sourceId: interactionState.note.id
		}
	];
}

function toEditableTimelineNote(
	note: Pick<TMidiNote, 'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'>
): TTimelineEditableNote {
	return {
		id: note.id,
		tick: note.tick,
		durationTicks: note.durationTicks,
		noteNumber: note.noteNumber,
		velocity: note.velocity
	};
}
