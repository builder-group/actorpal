import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { scaleTime } from '@visx/scale';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import React from 'react';
import { specta } from '@/environment';
import { formatDuration } from '@/lib';

const ROW_HEIGHT = 36;
const ROW_PADDING = 12;
const LABEL_WIDTH = 140;
const TIMELINE_PADDING = 20;
const AXIS_HEIGHT = 60;

const COLORS = [
	'#3b82f6', // blue
	'#ef4444', // red
	'#10b981', // green
	'#f59e0b', // amber
	'#8b5cf6', // purple
	'#ec4899', // pink
	'#06b6d4', // cyan
	'#84cc16' // lime
] as const;

function getColorForApp(appId: number): string {
	const index = Math.abs(appId) % COLORS.length;
	return COLORS[index] ?? COLORS[0] ?? '#3b82f6';
}

function formatTime(timestamp: number): string {
	const date = new Date(timestamp * 1000);
	const time = date.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	return time ?? '';
}

function formatDateShort(timestamp: number): string {
	const date = new Date(timestamp * 1000);
	const dateStr = date.toLocaleDateString('en-US', {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	});
	return dateStr ?? '';
}

interface TActivityTimelineProps {
	windowActivities: specta.WindowActivity[];
	appActivities: specta.AppActivity[];
	width?: number;
}

export const ActivityTimeline: React.FC<TActivityTimelineProps> = (props) => {
	const { windowActivities, appActivities, width = 1000 } = props;
	const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
		useTooltip<string>();

	const allActivities = React.useMemo(() => {
		const window = windowActivities.map((a) => ({ ...a, type: 'window' as const }));
		const app = appActivities.map((a) => ({ ...a, type: 'app' as const }));
		return [...window, ...app].sort((a, b) => a.startTime - b.startTime);
	}, [windowActivities, appActivities]);

	const timeRange = React.useMemo(() => {
		if (allActivities.length === 0) {
			return { min: 0, max: 0 };
		}

		const times = allActivities.flatMap((a) => [a.startTime, a.endTime]);
		const min = Math.min(...times);
		const max = Math.max(...times);
		return { min, max };
	}, [allActivities]);

	const xScale = React.useMemo(
		() =>
			scaleTime({
				domain: [timeRange.min * 1000, timeRange.max * 1000],
				range: [0, width - LABEL_WIDTH - TIMELINE_PADDING * 2]
			}),
		[timeRange, width]
	);

	const rows = React.useMemo(() => {
		const rows: Array<{ label: string; activities: typeof allActivities }> = [];

		if (windowActivities.length > 0) {
			rows.push({
				label: 'Window Activities',
				activities: windowActivities.map((a) => ({ ...a, type: 'window' as const }))
			});
		}

		if (appActivities.length > 0) {
			rows.push({
				label: 'App Activities',
				activities: appActivities.map((a) => ({ ...a, type: 'app' as const }))
			});
		}

		return rows;
	}, [windowActivities, appActivities]);

	if (allActivities.length === 0) {
		return (
			<div className="rounded-lg border border-gray-200 bg-white p-6">
				<p className="text-sm text-gray-500">No activities to display</p>
			</div>
		);
	}

	const totalHeight = rows.length * (ROW_HEIGHT + ROW_PADDING) + AXIS_HEIGHT + TIMELINE_PADDING;

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<h2 className="mb-6 text-lg font-semibold text-gray-900">Activity Timeline</h2>
			<div className="overflow-x-auto">
				<svg width={width} height={totalHeight}>
					<Group>
						{/* Row labels and activity bars */}
						{rows.map((row, rowIndex) => {
							const y = rowIndex * (ROW_HEIGHT + ROW_PADDING) + TIMELINE_PADDING;

							return (
								<Group key={row.label}>
									{/* Row label */}
									<text
										x={LABEL_WIDTH - 10}
										y={y + ROW_HEIGHT / 2}
										dy="0.35em"
										textAnchor="end"
										fontSize={13}
										fontWeight={500}
										fill="#374151"
									>
										{row.label}
									</text>

									{/* Activity segments */}
									{row.activities.map((activity, activityIndex) => {
										const x0 = xScale(activity.startTime * 1000);
										const x1 = xScale(activity.endTime * 1000);
										const barWidth = Math.max(2, x1 - x0);
										const color = getColorForApp(activity.appId);

										function handleMouseEnter(event: React.MouseEvent<SVGRectElement>): void {
											const svgElement = (event.target as SVGElement).ownerSVGElement;
											if (svgElement == null) {
												return;
											}

											const coords = localPoint(svgElement, event);
											if (coords == null) {
												return;
											}

											const duration = formatDuration(activity.endTime - activity.startTime);
											const startTime = formatTime(activity.startTime);
											const endTime = formatTime(activity.endTime);

											const tooltipLines: string[] = [];

											if (activity.type === 'window') {
												if (activity.windowTitle != null) {
													tooltipLines.push(`Window: ${activity.windowTitle}`);
												} else {
													tooltipLines.push(`Window Activity (App ID: ${activity.appId})`);
												}
												if (activity.browser?.url != null) {
													tooltipLines.push(`URL: ${activity.browser.url}`);
													if (activity.browser.isPrivate === true) {
														tooltipLines.push('Private browsing');
													}
												}
												if (
													activity.windowBounds?.width != null &&
													activity.windowBounds?.height != null
												) {
													tooltipLines.push(
														`Size: ${Math.round(activity.windowBounds.width)} × ${Math.round(activity.windowBounds.height)}`
													);
												}
											} else {
												tooltipLines.push(`App Activity`);
												tooltipLines.push(`App ID: ${activity.appId}`);
											}

											tooltipLines.push('');
											tooltipLines.push(`${startTime} - ${endTime}`);
											tooltipLines.push(`Duration: ${duration}`);

											const tooltipText = tooltipLines.join('\n');
											showTooltip({
												tooltipData: tooltipText,
												tooltipTop: coords.y + 10,
												tooltipLeft: coords.x + 10
											});
										}

										return (
											<rect
												key={activityIndex}
												x={LABEL_WIDTH + TIMELINE_PADDING + x0}
												y={y}
												width={barWidth}
												height={ROW_HEIGHT}
												fill={color}
												rx={3}
												opacity={0.8}
												onMouseEnter={handleMouseEnter}
												onMouseLeave={hideTooltip}
												onMouseOver={(e) => {
													e.currentTarget.setAttribute('opacity', '1');
												}}
												onMouseOut={(e) => {
													e.currentTarget.setAttribute('opacity', '0.8');
												}}
												style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
											/>
										);
									})}
								</Group>
							);
						})}

						{/* Time axis grid lines and labels */}
						<Group>
							{Array.from({ length: 10 }).map((_, i) => {
								const time = timeRange.min + ((timeRange.max - timeRange.min) * i) / 9;
								const x = LABEL_WIDTH + TIMELINE_PADDING + xScale(time * 1000);
								const y = rows.length * (ROW_HEIGHT + ROW_PADDING) + TIMELINE_PADDING;

								return (
									<Group key={i}>
										<line
											x1={x}
											y1={y}
											x2={x}
											y2={y + rows.length * (ROW_HEIGHT + ROW_PADDING)}
											stroke="#e5e7eb"
											strokeWidth={1}
										/>
										<text
											x={x}
											y={y + rows.length * (ROW_HEIGHT + ROW_PADDING) + 20}
											textAnchor="middle"
											fontSize={11}
											fill="#6b7280"
										>
											{formatTime(time)}
										</text>
									</Group>
								);
							})}
						</Group>

						{/* Date label */}
						<text
							x={LABEL_WIDTH + TIMELINE_PADDING}
							y={rows.length * (ROW_HEIGHT + ROW_PADDING) + TIMELINE_PADDING + AXIS_HEIGHT - 10}
							fontSize={12}
							fontWeight={500}
							fill="#374151"
						>
							{formatDateShort(timeRange.min)}
						</text>
					</Group>
				</svg>
			</div>

			{tooltipOpen && tooltipData != null && (
				<TooltipWithBounds top={tooltipTop} left={tooltipLeft}>
					<div
						className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
						style={{ whiteSpace: 'pre-line' }}
					>
						{tooltipData}
					</div>
				</TooltipWithBounds>
			)}
		</div>
	);
};
