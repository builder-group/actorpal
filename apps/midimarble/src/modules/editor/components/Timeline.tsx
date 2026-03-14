import React from 'react';
import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { useResource } from '@/modules/engine';
import { useEditorCx } from '../EditorCx';

const TIMELINE_HEIGHT = 84;
const RULER_HEIGHT = 28;
const PIXELS_PER_SECOND = 80;
const STEP_REPEAT_INITIAL_DELAY_MS = 260;
const STEP_REPEAT_INTERVAL_MS = 70;

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
				}, STEP_REPEAT_INTERVAL_MS);
			}, STEP_REPEAT_INITIAL_DELAY_MS);
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

const TimelineHeader: React.FC<{
	isReady: boolean;
	mode: 'paused' | 'running';
	playheadStep: number;
	preloadedSteps: number;
	statusLabel: string | null;
	onStepBackward: () => void;
	onStepForward: () => void;
	onPlay: () => void;
	onPause: () => void;
	onReset: () => void;
}> = ({
	isReady,
	mode,
	playheadStep,
	preloadedSteps,
	statusLabel,
	onStepBackward,
	onStepForward,
	onPlay,
	onPause,
	onReset
}) => (
	<div className="border-base-200 bg-base-50 flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
		<h3 className="text-base-700 text-xs font-semibold tracking-wide uppercase">Timeline</h3>

		{statusLabel != null ? (
			<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
				{statusLabel}
			</span>
		) : null}

		<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase">
			Step {playheadStep}
		</span>

		<span className="text-base-500 bg-base-100 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase">
			Preloaded {preloadedSteps}
		</span>

		<div className="ml-auto flex items-center gap-1">
			<TimelineIconButton
				disabled={!isReady}
				icon={Square}
				title="Reset to step 0"
				onClick={onReset}
			/>

			<TimelineIconButton
				disabled={!isReady}
				icon={SkipBack}
				title="Step backward"
				onClick={onStepBackward}
				repeatOnHold
			/>

			{mode === 'running' ? (
				<TimelineIconButton
					disabled={!isReady}
					icon={Pause}
					title="Pause"
					onClick={onPause}
				/>
			) : (
				<TimelineIconButton
					disabled={!isReady}
					icon={Play}
					title="Play"
					onClick={onPlay}
				/>
			)}

			<TimelineIconButton
				disabled={!isReady}
				icon={SkipForward}
				title="Step forward"
				onClick={onStepForward}
				repeatOnHold
			/>
		</div>
	</div>
);

const TimelineRuler: React.FC<{
	totalDurationSeconds: number;
	bufferedPx: number;
	pixelsPerSecond: number;
}> = ({ totalDurationSeconds, bufferedPx, pixelsPerSecond }) => {
	const secondTicks = Array.from(
		{ length: Math.ceil(totalDurationSeconds) + 1 },
		(_, index) => index
	);

	return (
		<div
			className="border-base-200 bg-base-50 relative shrink-0 border-b select-none"
			style={{ height: RULER_HEIGHT }}
		>
			<div
				className="bg-base-100 pointer-events-none absolute inset-y-0 left-0"
				style={{ width: bufferedPx }}
			/>

			{secondTicks.map((second) => (
				<div key={second} className="absolute bottom-0" style={{ left: second * pixelsPerSecond }}>
					<div className="bg-base-300 absolute bottom-0 w-px" style={{ height: 10 }} />
					<span
						className="text-base-400 absolute bottom-3 font-mono text-[9px]"
						style={{ transform: 'translateX(-50%)' }}
					>
						{second}s
					</span>
				</div>
			))}

			{secondTicks.slice(0, -1).map((second) => (
				<div
					key={`${second}-half`}
					className="absolute bottom-0"
					style={{ left: (second + 0.5) * pixelsPerSecond }}
				>
					<div className="bg-base-200 absolute bottom-0 w-px" style={{ height: 5 }} />
				</div>
			))}
		</div>
	);
};

export const Timeline: React.FC<{ className?: string }> = ({ className }) => {
	const cx = useEditorCx();
	const app = cx.runtime.app;
	const isReady = useResource(app, 'isReady');
	const transport = useResource(app, 'transport');
	const bufferedStep = useResource(app, 'bufferedStep');
	const simulationSync = useResource(app, 'simulationSync');
	const simulationConfig = useResource(app, 'simulationConfig');
	const fixedTimeStepSeconds = useResource(app, 'fixedTimeStepSeconds');
	const statusLabel =
		simulationSync.mode === 'idle'
			? null
			: simulationSync.mode === 'dirty'
			? 'Pending'
				: 'Recomputing';
	const playheadSeconds = transport.playheadStep * fixedTimeStepSeconds;
	const bufferedSeconds = bufferedStep * fixedTimeStepSeconds;
	const preloadedSteps = Math.max(0, bufferedStep - transport.playheadStep);
	const totalDurationSeconds = Math.max(
		simulationConfig.preloadHorizonSteps * fixedTimeStepSeconds,
		bufferedSeconds
	);

	const totalWidthPx = Math.max(totalDurationSeconds * PIXELS_PER_SECOND, 1);
	const playheadPx = playheadSeconds * PIXELS_PER_SECOND;
	const bufferedPx = bufferedSeconds * PIXELS_PER_SECOND;

	const [isDragging, setIsDragging] = React.useState(false);
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const playheadLineRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (playheadLineRef.current != null) {
			playheadLineRef.current.style.left = `${playheadPx}px`;
		}
	}, [playheadPx]);

	const seekFromClientX = React.useCallback(
		(clientX: number) => {
			const container = scrollRef.current;
			if (container == null || !isReady) {
				return;
			}

			const rect = container.getBoundingClientRect();
			const px = clientX - rect.left + container.scrollLeft;
			cx.runtime.seekToSeconds(Math.max(0, px / PIXELS_PER_SECOND));
		},
		[cx, isReady]
	);

	const handlePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			event.currentTarget.setPointerCapture(event.pointerId);
			setIsDragging(true);
			seekFromClientX(event.clientX);
		},
		[seekFromClientX]
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

	return (
		<section
			className={['bg-base-0 flex h-full flex-col overflow-hidden', className]
				.filter(Boolean)
				.join(' ')}
		>
			<TimelineHeader
				isReady={isReady}
				mode={transport.mode}
				playheadStep={transport.playheadStep}
				preloadedSteps={preloadedSteps}
				statusLabel={statusLabel}
				onStepBackward={() => cx.runtime.stepBackward()}
				onStepForward={() => cx.runtime.stepForward()}
				onPlay={() => cx.runtime.run()}
				onPause={() => cx.runtime.pause()}
				onReset={() => cx.runtime.reset()}
			/>

			<div
				ref={scrollRef}
				className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
				style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			>
				<div className="relative" style={{ width: totalWidthPx }}>
					<TimelineRuler
						totalDurationSeconds={totalDurationSeconds}
						bufferedPx={bufferedPx}
						pixelsPerSecond={PIXELS_PER_SECOND}
					/>

					<div
						className="border-base-200 bg-base-0 relative border-b"
						style={{ height: TIMELINE_HEIGHT - RULER_HEIGHT }}
					>
						<div
							className="pointer-events-none absolute inset-y-0 left-0"
							style={{
								width: bufferedPx,
								background:
									'linear-gradient(90deg, rgba(148,163,184,0.12) 0%, rgba(148,163,184,0.06) 100%)'
							}}
						/>
						<div className="border-base-100 absolute inset-x-0 top-1/2 border-t border-dashed" />
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
		</section>
	);
};
