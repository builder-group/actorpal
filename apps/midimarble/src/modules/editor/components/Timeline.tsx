import React from 'react';
import { useResource } from '@/modules/engine';
import type { TTimelineItem } from '@/modules/engine';
import { useEditorCx } from '../EditorCx';

const TIMELINE_HEIGHT = 84;
const RULER_HEIGHT = 28;

const TimelineHeader: React.FC<{
	viewLabels: Array<{ id: string; label: string }>;
	activeViewId: string;
	isReady: boolean;
	mode: 'paused' | 'running';
	onSelectView: (viewId: string) => void;
	onPlay: () => void;
	onPause: () => void;
	onReset: () => void;
}> = ({ viewLabels, activeViewId, isReady, mode, onSelectView, onPlay, onPause, onReset }) => (
	<div className="border-base-200 bg-base-50 flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
		{viewLabels.length > 1 ? (
			viewLabels.map((view) => (
				<button
					key={view.id}
					onClick={() => onSelectView(view.id)}
					className={[
						'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
						view.id === activeViewId
							? 'bg-base-200 text-base-800'
							: 'text-base-500 hover:text-base-700',
					].join(' ')}
				>
					{view.label}
				</button>
			))
		) : (
			<h3 className="text-base-700 text-xs font-semibold tracking-wide uppercase">Timeline</h3>
		)}

		<div className="ml-auto flex items-center gap-1">
			<button
				onClick={onReset}
				disabled={!isReady}
				title="Reset"
				className="text-base-500 hover:text-base-800 flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-30"
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
					<rect x="0" y="1" width="2" height="10" rx="0.5" />
					<polygon points="11,1 3,6 11,11" />
				</svg>
			</button>

			{mode === 'running' ? (
				<button
					onClick={onPause}
					disabled={!isReady}
					title="Pause"
					className="text-base-500 hover:text-base-800 flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-30"
				>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
						<rect x="1.5" y="1" width="3" height="10" rx="0.5" />
						<rect x="7.5" y="1" width="3" height="10" rx="0.5" />
					</svg>
				</button>
			) : (
				<button
					onClick={onPlay}
					disabled={!isReady}
					title="Play"
					className="text-base-500 hover:text-base-800 flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-30"
				>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
						<polygon points="2,1 11,6 2,11" />
					</svg>
				</button>
			)}
		</div>
	</div>
);

const TimelineRuler: React.FC<{
	totalDurationSeconds: number;
	bufferedPx: number;
	pixelsPerSecond: number;
}> = ({ totalDurationSeconds, bufferedPx, pixelsPerSecond }) => {
	const secondTicks = Array.from({ length: Math.ceil(totalDurationSeconds) + 1 }, (_, index) => index);

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

const TimelineItemsLayer: React.FC<{
	items: TTimelineItem[];
	pixelsPerSecond: number;
}> = ({ items, pixelsPerSecond }) => (
	<div className="pointer-events-none absolute inset-0">
		{items.map((item) =>
			item.type === 'point' ? (
				<div
					key={item.id}
					className="absolute top-3 h-4 w-1 rounded-full"
					style={{
						left: item.timeSeconds * pixelsPerSecond,
						background: item.color ?? '#ef4444'
					}}
				/>
			) : (
				<div
					key={item.id}
					className="absolute top-3 h-4 rounded-full"
					style={{
						left: item.startSeconds * pixelsPerSecond,
						width: Math.max(2, (item.endSeconds - item.startSeconds) * pixelsPerSecond),
						background: item.color ?? '#9ca3af'
					}}
				/>
			)
		)}
	</div>
);

export const Timeline: React.FC<{ className?: string }> = ({ className }) => {
	const cx = useEditorCx();
	const app = cx.runtime.app;
	const isReady = useResource(app, 'isReady');
	const transport = useResource(app, 'simulationTransport');
	const simulationConfig = app.r.simulationConfig;
	const timelineUi = useResource(app, 'timelineUi');
	useResource(app, 'timelineContributors');

	const viewModel = app.getTimelineViewModel();
	const fixedTimeStepSeconds = app.r.fixedTimeStepSeconds;
	const playheadSeconds = transport.playheadStep * fixedTimeStepSeconds;
	const bufferedSeconds = transport.bufferedStep * fixedTimeStepSeconds;
	const totalDurationSeconds = Math.max(
		simulationConfig.preloadHorizonSteps * fixedTimeStepSeconds,
		bufferedSeconds
	);

	const totalWidthPx = Math.max(totalDurationSeconds * timelineUi.pixelsPerSecond, 1);
	const playheadPx = playheadSeconds * timelineUi.pixelsPerSecond;
	const bufferedPx = bufferedSeconds * timelineUi.pixelsPerSecond;

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
			cx.runtime.seekToSeconds(Math.max(0, px / timelineUi.pixelsPerSecond));
		},
		[cx, isReady, timelineUi.pixelsPerSecond]
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
			className={['bg-base-0 flex h-full flex-col overflow-hidden', className].filter(Boolean).join(' ')}
		>
			<TimelineHeader
				viewLabels={viewModel.views.map((view) => ({ id: view.id, label: view.label }))}
				activeViewId={viewModel.activeViewId}
				isReady={isReady}
				mode={transport.mode}
				onSelectView={(viewId) => app.setActiveTimelineView(viewId)}
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
						pixelsPerSecond={timelineUi.pixelsPerSecond}
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
						<TimelineItemsLayer
							items={viewModel.items}
							pixelsPerSecond={timelineUi.pixelsPerSecond}
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
		</section>
	);
};
