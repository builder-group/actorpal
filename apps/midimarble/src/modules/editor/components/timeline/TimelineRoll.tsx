import React from 'react';
import type { TMidiNote } from '@/modules/engine/plugins/midi';
import {
	buildBeatTicks,
	getNoteName,
	isBlackKey,
	MIN_ROLL_HEIGHT,
	NOTE_ROW_HEIGHT,
	PIANO_WIDTH,
	RULER_HEIGHT
} from '../../lib/timeline-layout';

export interface TTimelineDraftNote extends Pick<
	TMidiNote,
	'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'
> {
	sourceId: number | null;
}

export interface TTimelineGridPointerInput {
	pointerId: number;
	tick: number;
	noteNumber: number;
	clientX: number;
	clientY: number;
}

export interface TTimelineNotePointerInput extends TTimelineGridPointerInput {
	note: Pick<TMidiNote, 'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'>;
	edge: 'body' | 'start' | 'end';
	additive: boolean;
}

const PianoColumn: React.FC<{
	noteRows: number[];
	contentHeight: number;
	activeNoteNumbers: Set<number>;
	onKeyPointerDown: (noteNumber: number) => void;
}> = ({ noteRows, contentHeight, activeNoteNumbers, onKeyPointerDown }) => (
	<div
		className="border-base-200 sticky left-0 z-10 flex shrink-0 flex-col border-r"
		style={{ width: PIANO_WIDTH, background: '#ffffff' }}
	>
		<div
			className="border-base-200 sticky top-0 z-20 border-b"
			style={{ height: RULER_HEIGHT, background: '#ffffff' }}
		/>

		<div className="relative flex-1" style={{ minHeight: MIN_ROLL_HEIGHT }}>
			<div className="relative min-h-full" style={{ height: contentHeight }}>
				{noteRows.map((noteNumber, index) => (
					<PianoKeyRow
						key={noteNumber}
						noteNumber={noteNumber}
						top={index * NOTE_ROW_HEIGHT}
						isActive={activeNoteNumbers.has(noteNumber)}
						onPointerDown={onKeyPointerDown}
					/>
				))}
			</div>
		</div>
	</div>
);

const PianoKeyRow: React.FC<{
	noteNumber: number;
	top: number;
	isActive: boolean;
	onPointerDown: (noteNumber: number) => void;
}> = ({ noteNumber, top, isActive, onPointerDown }) => {
	const blackKey = isBlackKey(noteNumber);
	const cNote = noteNumber % 12 === 0;

	return (
		<button
			type="button"
			className="border-base-200 absolute inset-x-0 border-b text-left transition-colors"
			style={{
				top,
				height: NOTE_ROW_HEIGHT,
				background: '#ffffff',
				boxShadow: isActive ? 'inset 0 0 0 999px rgba(59, 130, 246, 0.14)' : undefined
			}}
			title={`Play ${getNoteName(noteNumber)}`}
			tabIndex={-1}
			onPointerDown={(event) => {
				event.preventDefault();
				onPointerDown(noteNumber);
			}}
		>
			<div
				className="absolute inset-y-0 left-0 w-10 transition-transform"
				style={{
					background: blackKey
						? 'linear-gradient(90deg, #05070b 0%, #111827 72%, #2f3542 100%)'
						: 'transparent',
					transform: isActive ? 'translateX(1px) scaleX(0.985)' : undefined,
					boxShadow: blackKey
						? isActive
							? 'inset 0 0 0 999px rgba(59, 130, 246, 0.18), 1px 1px 0 rgba(0,0,0,0.2)'
							: '1px 1px 0 rgba(0,0,0,0.2)'
						: undefined
				}}
			/>

			{cNote ? (
				<span
					className="absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[10px] font-semibold"
					style={{ color: isActive ? '#2563eb' : '#6b7280' }}
				>
					{getNoteName(noteNumber)}
				</span>
			) : null}
		</button>
	);
};

const TimelineRuler: React.FC<{
	ticksPerBeat: number;
	bufferedPx: number;
	playheadPx: number;
	pixelsPerTick: number;
	beatTicks: { majorBeats: number[]; minorBeats: number[] };
	onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: () => void;
}> = ({
	ticksPerBeat,
	bufferedPx,
	playheadPx,
	pixelsPerTick,
	beatTicks,
	onPointerDown,
	onPointerMove,
	onPointerUp
}) => {
	return (
		<div
			className="border-base-200 bg-base-50 sticky top-0 z-20 shrink-0 border-b select-none"
			style={{ height: RULER_HEIGHT }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
			onLostPointerCapture={onPointerUp}
		>
			<div
				className="pointer-events-none absolute inset-y-0 left-0"
				style={{ background: 'var(--color-base-100)', width: bufferedPx }}
			/>

			{beatTicks.majorBeats.map((beat) => (
				<div
					key={beat}
					className="absolute bottom-0"
					style={{ left: beat * ticksPerBeat * pixelsPerTick }}
				>
					<div className="bg-base-300 absolute bottom-0 w-px" style={{ height: 10 }} />
					<span
						className="text-base-400 absolute bottom-3 font-mono text-[9px]"
						style={{ transform: 'translateX(-50%)' }}
					>
						{`B${beat}`}
					</span>
				</div>
			))}

			{beatTicks.minorBeats.map((beat) => (
				<div
					key={beat}
					className="absolute bottom-0"
					style={{ left: beat * ticksPerBeat * pixelsPerTick }}
				>
					<div className="bg-base-200 absolute bottom-0 w-px" style={{ height: 5 }} />
				</div>
			))}

			<div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: playheadPx }}>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: -4,
						width: 8,
						height: 14,
						background: '#ef4444',
						clipPath: 'polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%)'
					}}
				/>
				<div
					className="absolute inset-y-0 w-px"
					style={{ background: '#ef4444', left: '-0.5px' }}
				/>
			</div>
		</div>
	);
};

const PianoRollGrid: React.FC<{
	noteRows: number[];
	ticksPerBeat: number;
	pixelsPerTick: number;
	contentHeight: number;
	beatTicks: { majorBeats: number[]; minorBeats: number[] };
	notes: Array<Pick<TMidiNote, 'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'>>;
	draftNotes: TTimelineDraftNote[];
	selectedNoteId: number | null;
	selectedNoteIds: Set<number>;
	hiddenNoteIds: Set<number>;
	activeNoteIds: Set<number>;
	placedNoteIds: Set<number>;
	adjustedNoteIds: Set<number>;
	onNotePointerDown: (
		event: React.PointerEvent<HTMLButtonElement>,
		note: Pick<TMidiNote, 'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'>
	) => void;
}> = ({
	noteRows,
	ticksPerBeat,
	pixelsPerTick,
	contentHeight,
	beatTicks,
	notes,
	draftNotes,
	selectedNoteId,
	selectedNoteIds,
	hiddenNoteIds,
	activeNoteIds,
	placedNoteIds,
	adjustedNoteIds,
	onNotePointerDown
}) => {
	const noteIndexByNumber = React.useMemo(
		() => new Map(noteRows.map((noteNumber, index) => [noteNumber, index])),
		[noteRows]
	);

	return (
		<div className="relative min-h-full" style={{ height: contentHeight }}>
			{noteRows.map((noteNumber, index) => (
				<div
					key={noteNumber}
					className="border-base-200 absolute inset-x-0 border-b"
					style={{
						top: index * NOTE_ROW_HEIGHT,
						height: NOTE_ROW_HEIGHT,
						background: isBlackKey(noteNumber)
							? 'var(--color-base-100)'
							: index % 2 === 0
								? 'var(--color-base-0)'
								: 'var(--color-base-50)'
					}}
				/>
			))}

			{beatTicks.majorBeats.map((beat) => (
				<div
					key={`major-${beat}`}
					className="bg-base-300 absolute inset-y-0 w-px"
					style={{ left: beat * ticksPerBeat * pixelsPerTick }}
				/>
			))}

			{beatTicks.minorBeats.map((beat) => (
				<div
					key={`minor-${beat}`}
					className="bg-base-200 absolute inset-y-0 w-px"
					style={{ left: beat * ticksPerBeat * pixelsPerTick }}
				/>
			))}

			{notes.map((note) => {
				if (hiddenNoteIds.has(note.id)) {
					return null;
				}

				const noteRow = noteIndexByNumber.get(note.noteNumber);
				if (noteRow == null) {
					return null;
				}

				const isAdjusted = adjustedNoteIds.has(note.id);
				const isPlaced = placedNoteIds.has(note.id);
				const isPrimarySelected = note.id === selectedNoteId;
				const isSelected = selectedNoteIds.has(note.id);
				const isActive = activeNoteIds.has(note.id);

				return (
					<button
						key={note.id}
						type="button"
						className="absolute overflow-hidden rounded-sm border text-left transition-transform hover:brightness-105 focus:outline-none"
						style={{
							left: note.tick * pixelsPerTick,
							top: noteRow * NOTE_ROW_HEIGHT + 2,
							width: Math.max(note.durationTicks * pixelsPerTick, 3),
							height: NOTE_ROW_HEIGHT - 4,
							background: isAdjusted
								? `hsl(${36 + Math.round((note.velocity / 127) * 8)} 88% 56%)`
								: isPlaced
									? `hsl(${145 + Math.round((note.velocity / 127) * 12)} 55% 48%)`
									: `hsl(${210 + Math.round((note.velocity / 127) * 25)} 70% 56%)`,
							borderColor: isPrimarySelected
								? 'rgba(244, 63, 94, 0.92)'
								: isSelected
									? 'rgba(244, 63, 94, 0.72)'
									: 'rgba(15, 23, 42, 0.18)',
							boxShadow: isActive
								? '0 0 0 2px rgba(59,130,246,0.28), inset 0 1px 0 rgba(255,255,255,0.35)'
								: isPrimarySelected
									? '0 0 0 2px rgba(244,63,94,0.26), inset 0 1px 0 rgba(255,255,255,0.35)'
									: isSelected
										? '0 0 0 1px rgba(244,63,94,0.28), inset 0 1px 0 rgba(255,255,255,0.35)'
										: 'inset 0 1px 0 rgba(255,255,255,0.28)',
							transform:
								isActive || isPrimarySelected
									? 'scaleY(1.05)'
									: isSelected
										? 'scaleY(1.02)'
										: undefined
						}}
						title={`${getNoteName(note.noteNumber)} · Tick ${note.tick}`}
						aria-pressed={isSelected}
						tabIndex={-1}
						onPointerDown={(event) => onNotePointerDown(event, note)}
					>
						<div
							className="pointer-events-none absolute inset-y-0 left-0"
							style={{
								width: 6,
								background: isPrimarySelected
									? 'rgba(255,255,255,0.52)'
									: isSelected
										? 'rgba(255,255,255,0.34)'
										: 'rgba(255,255,255,0.22)',
								boxShadow: '1px 0 0 rgba(15,23,42,0.18)'
							}}
						/>
						<div
							className="pointer-events-none absolute inset-y-0 right-0"
							style={{
								width: 6,
								background: isPrimarySelected
									? 'rgba(255,255,255,0.52)'
									: isSelected
										? 'rgba(255,255,255,0.34)'
										: 'rgba(255,255,255,0.22)',
								boxShadow: '-1px 0 0 rgba(15,23,42,0.18)'
							}}
						/>
					</button>
				);
			})}

			{draftNotes.map((note) => {
				const noteRow = noteIndexByNumber.get(note.noteNumber);
				if (noteRow == null) {
					return null;
				}

				return (
					<div
						key={`draft-${note.sourceId ?? note.id}`}
						className="pointer-events-none absolute overflow-hidden rounded-sm border border-dashed"
						style={{
							left: note.tick * pixelsPerTick,
							top: noteRow * NOTE_ROW_HEIGHT + 2,
							width: Math.max(note.durationTicks * pixelsPerTick, 3),
							height: NOTE_ROW_HEIGHT - 4,
							background: 'rgba(244, 63, 94, 0.18)',
							borderColor: 'rgba(244, 63, 94, 0.92)',
							boxShadow: '0 0 0 1px rgba(244,63,94,0.18)'
						}}
					/>
				);
			})}
		</div>
	);
};

export const TimelineRoll: React.FC<{
	timelineWidth: number;
	totalTicks: number;
	ticksPerBeat: number;
	pixelsPerTick: number;
	bufferedPx: number;
	playheadPx: number;
	contentHeight: number;
	noteRows: number[];
	notes: Array<Pick<TMidiNote, 'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'>>;
	draftNotes: TTimelineDraftNote[];
	selectedNoteId: number | null;
	selectedNoteIds: Set<number>;
	activeNoteIds: Set<number>;
	activeNoteNumbers: Set<number>;
	onPianoKeyPointerDown: (noteNumber: number) => void;
	placedNoteIds: Set<number>;
	adjustedNoteIds: Set<number>;
	canScrub: boolean;
	canEditNotes: boolean;
	isRulerDragging: boolean;
	onRulerPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	onRulerPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
	onRulerPointerUp: () => void;
	onGridPointerDown: (input: TTimelineGridPointerInput) => void;
	onGridPointerMove: (input: TTimelineGridPointerInput) => void;
	onGridPointerUp: () => void;
	onNotePointerDown: (input: TTimelineNotePointerInput) => void;
	onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}> = ({
	timelineWidth,
	totalTicks,
	ticksPerBeat,
	pixelsPerTick,
	bufferedPx,
	playheadPx,
	contentHeight,
	noteRows,
	notes,
	draftNotes,
	selectedNoteId,
	selectedNoteIds,
	activeNoteIds,
	activeNoteNumbers,
	onPianoKeyPointerDown,
	placedNoteIds,
	adjustedNoteIds,
	canScrub,
	canEditNotes,
	isRulerDragging,
	onRulerPointerDown,
	onRulerPointerMove,
	onRulerPointerUp,
	onGridPointerDown,
	onGridPointerMove,
	onGridPointerUp,
	onNotePointerDown,
	onKeyDown
}) => {
	const playheadLineRef = React.useRef<HTMLDivElement>(null);
	const gridSurfaceRef = React.useRef<HTMLDivElement>(null);
	const hiddenNoteIds = React.useMemo(
		() => new Set(draftNotes.flatMap((note) => (note.sourceId == null ? [] : [note.sourceId]))),
		[draftNotes]
	);
	const renderedTimelineWidth = Math.max(timelineWidth, Math.max(totalTicks * pixelsPerTick, 1));
	const renderedTotalTicks = Math.max(
		totalTicks,
		Math.ceil(renderedTimelineWidth / Math.max(pixelsPerTick, 0.0001))
	);
	const beatTicks = React.useMemo(
		() => buildBeatTicks(renderedTotalTicks, ticksPerBeat),
		[renderedTotalTicks, ticksPerBeat]
	);

	React.useEffect(() => {
		if (playheadLineRef.current != null) {
			playheadLineRef.current.style.left = `${playheadPx}px`;
		}
	}, [playheadPx]);

	const getGridPointerInput = React.useCallback(
		(pointerId: number, clientX: number, clientY: number): TTimelineGridPointerInput | null => {
			const surface = gridSurfaceRef.current;
			if (surface == null) {
				return null;
			}

			const rect = surface.getBoundingClientRect();
			const noteViewportX = Math.max(0, clientX - rect.left);
			const tick = noteViewportX / Math.max(pixelsPerTick, 0.0001);
			const noteRowIndex = Math.max(
				0,
				Math.min(noteRows.length - 1, Math.floor((clientY - rect.top) / NOTE_ROW_HEIGHT))
			);
			const noteNumber = noteRows[noteRowIndex] ?? noteRows[noteRows.length - 1] ?? 60;

			return {
				pointerId,
				tick,
				noteNumber,
				clientX,
				clientY
			};
		},
		[noteRows, pixelsPerTick]
	);

	const handleGridPointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!canEditNotes) {
				return;
			}

			gridSurfaceRef.current?.focus();
			gridSurfaceRef.current?.setPointerCapture(event.pointerId);
			const input = getGridPointerInput(event.pointerId, event.clientX, event.clientY);
			if (input != null) {
				onGridPointerDown(input);
			}
		},
		[canEditNotes, getGridPointerInput, onGridPointerDown]
	);

	const handleGridPointerMove = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			const input = getGridPointerInput(event.pointerId, event.clientX, event.clientY);
			if (input != null) {
				onGridPointerMove(input);
			}
		},
		[getGridPointerInput, onGridPointerMove]
	);

	const handleNoteButtonPointerDown = React.useCallback(
		(
			event: React.PointerEvent<HTMLButtonElement>,
			note: Pick<TMidiNote, 'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'>
		) => {
			event.preventDefault();
			event.stopPropagation();
			gridSurfaceRef.current?.focus();

			const input = getGridPointerInput(event.pointerId, event.clientX, event.clientY);
			if (input == null) {
				return;
			}

			const additive = event.metaKey || event.ctrlKey;
			const rect = event.currentTarget.getBoundingClientRect();
			const edgeSize = Math.min(12, Math.max(6, rect.width * 0.35));
			const canResize = canEditNotes && !additive;
			const edge =
				!canEditNotes || !canResize
					? 'body'
					: event.clientX - rect.left <= edgeSize
						? 'start'
						: rect.right - event.clientX <= edgeSize
							? 'end'
							: 'body';

			if (canEditNotes && !additive) {
				gridSurfaceRef.current?.setPointerCapture(event.pointerId);
			}

			onNotePointerDown({
				...input,
				note,
				edge,
				additive
			});
		},
		[canEditNotes, getGridPointerInput, onNotePointerDown]
	);

	return (
		<div className="min-h-full">
			<div className="flex min-h-full" style={{ width: PIANO_WIDTH + renderedTimelineWidth }}>
				<PianoColumn
					noteRows={noteRows}
					contentHeight={contentHeight}
					activeNoteNumbers={activeNoteNumbers}
					onKeyPointerDown={onPianoKeyPointerDown}
				/>

				<div
					className="relative flex min-h-full shrink-0 flex-col"
					style={{ width: renderedTimelineWidth }}
				>
					<TimelineRuler
						ticksPerBeat={ticksPerBeat}
						bufferedPx={bufferedPx}
						playheadPx={playheadPx}
						pixelsPerTick={pixelsPerTick}
						beatTicks={beatTicks}
						onPointerDown={onRulerPointerDown}
						onPointerMove={onRulerPointerMove}
						onPointerUp={onRulerPointerUp}
					/>

					<div
						ref={gridSurfaceRef}
						className="relative flex-1 outline-none"
						style={{
							minHeight: MIN_ROLL_HEIGHT,
							cursor: canEditNotes
								? isRulerDragging
									? 'grabbing'
									: 'crosshair'
								: canScrub
									? 'default'
									: 'default'
						}}
						tabIndex={0}
						onKeyDown={onKeyDown}
						onPointerDown={handleGridPointerDown}
						onPointerMove={handleGridPointerMove}
						onPointerUp={onGridPointerUp}
						onPointerCancel={onGridPointerUp}
						onLostPointerCapture={onGridPointerUp}
					>
						<PianoRollGrid
							noteRows={noteRows}
							ticksPerBeat={ticksPerBeat}
							pixelsPerTick={pixelsPerTick}
							contentHeight={contentHeight}
							beatTicks={beatTicks}
							notes={notes}
							draftNotes={draftNotes}
							selectedNoteId={selectedNoteId}
							selectedNoteIds={selectedNoteIds}
							hiddenNoteIds={hiddenNoteIds}
							activeNoteIds={activeNoteIds}
							placedNoteIds={placedNoteIds}
							adjustedNoteIds={adjustedNoteIds}
							onNotePointerDown={handleNoteButtonPointerDown}
						/>
					</div>

					<div
						ref={playheadLineRef}
						className="pointer-events-none absolute z-20"
						style={{ left: playheadPx, top: RULER_HEIGHT, bottom: 0 }}
					>
						<div
							className="absolute inset-y-0 w-px"
							style={{ background: '#ef4444', left: '-0.5px' }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
