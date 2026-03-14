import { FileUp, Pause, Play, SkipBack, SkipForward, Square, ZoomIn, ZoomOut } from 'lucide-react';
import React from 'react';

const TICK_REPEAT_INITIAL_DELAY_MS = 260;
const TICK_REPEAT_INTERVAL_MS = 70;

const TimelineIconButton: React.FC<{
	disabled: boolean;
	icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
	title: string;
	onClick: () => void;
	repeatOnHold?: boolean;
}> = ({ disabled, icon: Icon, title, onClick, repeatOnHold = false }) => {
	const timeoutRef = React.useRef<number | null>(null);
	const intervalRef = React.useRef<number | null>(null);
	const suppressResetRef = React.useRef<number | null>(null);
	const suppressClickRef = React.useRef(false);

	const clearRepeat = React.useCallback(() => {
		if (timeoutRef.current != null) {
			window.clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		if (intervalRef.current != null) {
			window.clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		if (suppressResetRef.current != null) {
			window.clearTimeout(suppressResetRef.current);
			suppressResetRef.current = null;
		}
	}, []);

	React.useEffect(() => clearRepeat, [clearRepeat]);

	const handlePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) => {
			if (!repeatOnHold || disabled || event.button !== 0) {
				return;
			}

			suppressClickRef.current = true;
			event.currentTarget.setPointerCapture(event.pointerId);
			onClick();

			timeoutRef.current = window.setTimeout(() => {
				intervalRef.current = window.setInterval(() => {
					onClick();
				}, TICK_REPEAT_INTERVAL_MS);
			}, TICK_REPEAT_INITIAL_DELAY_MS);
		},
		[disabled, onClick, repeatOnHold]
	);

	const handleClick = React.useCallback(() => {
		if (suppressClickRef.current) {
			suppressClickRef.current = false;
			return;
		}

		onClick();
	}, [onClick]);

	const stopRepeat = React.useCallback(() => {
		clearRepeat();
		suppressResetRef.current = window.setTimeout(() => {
			suppressClickRef.current = false;
			suppressResetRef.current = null;
		}, 0);
	}, [clearRepeat]);

	return (
		<button
			onClick={handleClick}
			onPointerDown={handlePointerDown}
			onPointerUp={stopRepeat}
			onPointerCancel={stopRepeat}
			onPointerLeave={stopRepeat}
			onLostPointerCapture={stopRepeat}
			disabled={disabled}
			title={title}
			className="text-base-500 hover:text-base-800 flex h-7 w-7 items-center justify-center rounded transition-colors disabled:opacity-30"
		>
			<Icon size={14} strokeWidth={1.8} />
		</button>
	);
};

const TimelineOpenMidiButton: React.FC<{
	disabled: boolean;
	label: string;
	onClick: () => void;
}> = ({ disabled, label, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		disabled={disabled}
		className="border-base-200 text-base-700 hover:bg-base-100 inline-flex h-7 items-center gap-1.5 rounded border px-2.5 text-[11px] font-medium transition-colors disabled:opacity-50"
	>
		<FileUp size={13} strokeWidth={1.8} />
		<span>{label}</span>
	</button>
);

export const TimelineHeader: React.FC<{
	canControlPlayback: boolean;
	canZoom: boolean;
	isImporting: boolean;
	importLabel: string;
	importError: string | null;
	mode: 'paused' | 'running';
	songName: string | null;
	trackName: string | null;
	bpm: number | null;
	playheadTick: number;
	liveStep: number;
	preloadedSteps: number;
	selectedNoteLabel: string | null;
	zoomLabel: string;
	statusLabel: string | null;
	onOpenMidi: () => void;
	onStepBackwardTick: () => void;
	onStepForwardTick: () => void;
	onPlay: () => void;
	onPause: () => void;
	onReset: () => void;
	onZoomOut: () => void;
	onZoomIn: () => void;
}> = ({
	canControlPlayback,
	canZoom,
	isImporting,
	importLabel,
	importError,
	mode,
	songName,
	trackName,
	bpm,
	playheadTick,
	liveStep,
	preloadedSteps,
	selectedNoteLabel,
	zoomLabel,
	statusLabel,
	onOpenMidi,
	onStepBackwardTick,
	onStepForwardTick,
	onPlay,
	onPause,
	onReset,
	onZoomOut,
	onZoomIn
}) => (
	<div className="border-base-200 bg-base-50 shrink-0 border-b px-3 py-1.5">
		<div className="flex items-center gap-2">
			<h3 className="text-base-700 text-xs font-semibold tracking-wide uppercase">Timeline</h3>

			{statusLabel != null ? (
				<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
					{statusLabel}
				</span>
			) : null}

			{importError != null ? (
				<span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 uppercase">
					{importError}
				</span>
			) : null}

			{songName != null ? (
				<span className="text-base-600 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase">
					{songName}
				</span>
			) : (
				<span className="text-base-400 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase">
					No MIDI
				</span>
			)}

			{trackName != null ? (
				<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
					{trackName}
				</span>
			) : null}

			{bpm != null ? (
				<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase">
					BPM {bpm}
				</span>
			) : null}

			<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase">
				Tick {Math.round(playheadTick)}
			</span>

			<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase">
				Step {liveStep}
			</span>

			<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase">
				Preloaded {preloadedSteps}
			</span>

			{selectedNoteLabel != null ? (
				<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase">
					Note {selectedNoteLabel}
				</span>
			) : null}

			<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase">
				Zoom {zoomLabel}
			</span>

			<div className="ml-auto flex items-center gap-2">
				<TimelineOpenMidiButton disabled={isImporting} label={importLabel} onClick={onOpenMidi} />

				<div className="flex items-center gap-1">
					<TimelineIconButton
						disabled={!canZoom}
						icon={ZoomOut}
						title="Zoom out"
						onClick={onZoomOut}
					/>

					<TimelineIconButton
						disabled={!canZoom}
						icon={ZoomIn}
						title="Zoom in"
						onClick={onZoomIn}
					/>

					<TimelineIconButton
						disabled={!canControlPlayback}
						icon={Square}
						title="Reset to tick 0"
						onClick={onReset}
					/>

					<TimelineIconButton
						disabled={!canControlPlayback}
						icon={SkipBack}
						title="Back one tick"
						onClick={onStepBackwardTick}
						repeatOnHold
					/>

					{mode === 'running' ? (
						<TimelineIconButton
							disabled={!canControlPlayback}
							icon={Pause}
							title="Pause"
							onClick={onPause}
						/>
					) : (
						<TimelineIconButton
							disabled={!canControlPlayback}
							icon={Play}
							title="Play"
							onClick={onPlay}
						/>
					)}

					<TimelineIconButton
						disabled={!canControlPlayback}
						icon={SkipForward}
						title="Forward one tick"
						onClick={onStepForwardTick}
						repeatOnHold
					/>
				</div>
			</div>
		</div>
	</div>
);
