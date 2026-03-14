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

const PianoColumn: React.FC<{
	noteRows: number[];
	contentHeight: number;
}> = ({ noteRows, contentHeight }) => (
	<div
		className="border-base-200 bg-base-50 sticky left-0 z-10 flex shrink-0 flex-col border-r"
		style={{ width: PIANO_WIDTH }}
	>
		<div className="border-base-200 bg-base-50 border-b" style={{ height: RULER_HEIGHT }} />

		<div className="relative flex-1" style={{ minHeight: MIN_ROLL_HEIGHT }}>
			<div className="relative min-h-full" style={{ height: contentHeight }}>
				{noteRows.map((noteNumber, index) => (
					<PianoKeyRow key={noteNumber} noteNumber={noteNumber} top={index * NOTE_ROW_HEIGHT} />
				))}
			</div>
		</div>
	</div>
);

const PianoKeyRow: React.FC<{ noteNumber: number; top: number }> = ({ noteNumber, top }) => {
	const blackKey = isBlackKey(noteNumber);
	const cNote = noteNumber % 12 === 0;

	return (
		<div
			className="border-base-200 absolute inset-x-0 border-b"
			style={{
				top,
				height: NOTE_ROW_HEIGHT,
				background: blackKey ? '#ece8e2' : cNote ? '#f7f3ee' : '#fbf9f6'
			}}
		>
			<div
				className="absolute inset-y-0 left-0 w-10"
				style={{ background: blackKey ? '#3a3a3a' : 'transparent' }}
			/>

			{cNote ? (
				<span className="text-base-500 absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[10px] font-semibold">
					{getNoteName(noteNumber)}
				</span>
			) : null}
		</div>
	);
};

const TimelineRuler: React.FC<{
	ticksPerBeat: number;
	bufferedPx: number;
	pixelsPerTick: number;
	beatTicks: { majorBeats: number[]; minorBeats: number[] };
}> = ({ ticksPerBeat, bufferedPx, pixelsPerTick, beatTicks }) => {
	return (
		<div
			className="border-base-200 bg-base-50 relative shrink-0 border-b select-none"
			style={{ height: RULER_HEIGHT }}
		>
			<div
				className="pointer-events-none absolute inset-y-0 left-0 bg-slate-200"
				style={{ width: bufferedPx }}
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
		</div>
	);
};

const PianoRollGrid: React.FC<{
	ticksPerBeat: number;
	pixelsPerTick: number;
	contentHeight: number;
	noteRows: number[];
	beatTicks: { majorBeats: number[]; minorBeats: number[] };
	notes: Array<Pick<TMidiNote, 'id' | 'tick' | 'durationTicks' | 'noteNumber' | 'velocity'>>;
}> = ({ noteRows, ticksPerBeat, pixelsPerTick, contentHeight, beatTicks, notes }) => {
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
							? 'rgba(161, 161, 170, 0.06)'
							: index % 2 === 0
								? 'rgba(255,255,255,0.9)'
								: 'rgba(250,248,244,0.9)'
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
				const noteRow = noteIndexByNumber.get(note.noteNumber);
				if (noteRow == null) {
					return null;
				}

				return (
					<div
						key={note.id}
						className="absolute overflow-hidden rounded-sm border"
						style={{
							left: note.tick * pixelsPerTick,
							top: noteRow * NOTE_ROW_HEIGHT + 2,
							width: Math.max(note.durationTicks * pixelsPerTick, 3),
							height: NOTE_ROW_HEIGHT - 4,
							background: `hsl(${210 + Math.round((note.velocity / 127) * 25)} 70% 56%)`,
							borderColor: 'rgba(15, 23, 42, 0.18)',
							boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)'
						}}
						title={`${getNoteName(note.noteNumber)} · Tick ${note.tick}`}
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
	canScrub: boolean;
	isDragging: boolean;
	onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: () => void;
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
	canScrub,
	isDragging,
	onPointerDown,
	onPointerMove,
	onPointerUp
}) => {
	const playheadLineRef = React.useRef<HTMLDivElement>(null);
	const beatTicks = React.useMemo(
		() => buildBeatTicks(totalTicks, ticksPerBeat),
		[totalTicks, ticksPerBeat]
	);

	React.useEffect(() => {
		if (playheadLineRef.current != null) {
			playheadLineRef.current.style.left = `${playheadPx}px`;
		}
	}, [playheadPx]);

	return (
		<div className="min-h-full">
			<div className="flex min-h-full" style={{ width: PIANO_WIDTH + timelineWidth }}>
				<PianoColumn noteRows={noteRows} contentHeight={contentHeight} />

				<div
					className="relative flex min-h-full shrink-0 flex-col"
					style={{
						width: timelineWidth,
						cursor: canScrub ? (isDragging ? 'grabbing' : 'crosshair') : 'default'
					}}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
					onLostPointerCapture={onPointerUp}
				>
					<TimelineRuler
						ticksPerBeat={ticksPerBeat}
						bufferedPx={bufferedPx}
						pixelsPerTick={pixelsPerTick}
						beatTicks={beatTicks}
					/>

					<div className="relative flex-1" style={{ minHeight: MIN_ROLL_HEIGHT }}>
						<PianoRollGrid
							noteRows={noteRows}
							ticksPerBeat={ticksPerBeat}
							pixelsPerTick={pixelsPerTick}
							contentHeight={contentHeight}
							beatTicks={beatTicks}
							notes={notes}
						/>
					</div>

					<div
						ref={playheadLineRef}
						className="pointer-events-none absolute inset-y-0 z-20"
						style={{ left: playheadPx }}
					>
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
			</div>
		</div>
	);
};
