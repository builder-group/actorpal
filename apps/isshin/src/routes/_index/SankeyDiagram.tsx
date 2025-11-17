import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { Sankey, sankeyCenter } from '@visx/sankey';
import { BarRounded, LinkHorizontal } from '@visx/shape';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import React, { useState } from 'react';
import { specta } from '@/environment';
import { formatDuration } from '@/lib';

export const SankeyDiagram: React.FC<TSankeyDiagramProps> = (props) => {
	const { entries, width = 800, height = 600, maxWindowsPerApp = 5 } = props;
	const [maxWindows, setMaxWindows] = useState(maxWindowsPerApp);
	const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
		useTooltip<string>();

	const data = React.useMemo(() => buildSankeyData(entries, maxWindows), [entries, maxWindows]);

	if (data.nodes.length <= 1 || data.links.length === 0) {
		return null;
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-6">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-lg font-semibold">Activity Flow</h2>
				<div className="flex items-center gap-2">
					<label className="text-sm text-gray-600">Max windows per app:</label>
					<input
						type="number"
						min="1"
						max="20"
						value={maxWindows}
						onChange={(e) => handleMaxWindowsChange(e.target.value, setMaxWindows)}
						className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
					/>
				</div>
			</div>
			<div className="relative overflow-x-auto">
				<svg width={width} height={height}>
					<Sankey<TNodeDatum, TLinkDatum>
						root={data}
						nodeWidth={15}
						size={[width - 100, height - 20]}
						nodePadding={10}
						nodeAlign={sankeyCenter}
					>
						{({ graph, createPath }) => (
							<>
								<Group>
									{graph.links.map((link, i) => {
										const source = link.source as TNodeDatum & { name: string };
										const target = link.target as TNodeDatum & { name: string };
										const sourceName = trimAppPrefix(source.name);
										const targetName = trimAppPrefix(target.name);

										return (
											<LinkHorizontal
												key={i}
												data={link}
												path={createPath}
												fill="transparent"
												stroke="#3b82f6"
												strokeWidth={link.width}
												strokeOpacity={0.5}
												onPointerMove={(event) => {
													const svgElement = (event.target as SVGElement).ownerSVGElement;
													if (svgElement == null) {
														return;
													}
													const coords = localPoint(svgElement, event);
													if (coords == null) {
														return;
													}
													showTooltip({
														tooltipData: `${sourceName} → ${targetName}\n${formatDuration(link.value)}`,
														tooltipTop: coords.y + 10,
														tooltipLeft: coords.x + 10
													});
												}}
												onMouseOut={hideTooltip}
											/>
										);
									})}
								</Group>
								<Group>
									{graph.nodes.map((node, i) => {
										const {
											y0 = 0,
											y1 = 0,
											x0 = 0,
											x1 = 0,
											name,
											duration
										} = node as TNodeDatum & {
											y0?: number;
											y1?: number;
											x0?: number;
											x1?: number;
										};
										const displayName = trimAppPrefix(name);
										const maxLength = 50;
										const isTruncated = displayName.length > maxLength;
										const truncatedName = truncateText(displayName, maxLength);
										const isRightSide = x0 >= width / 2;

										function handleNodeTooltip(event: React.PointerEvent): void {
											const svgElement = (event.target as SVGElement).ownerSVGElement;
											if (svgElement == null) {
												return;
											}
											const coords = localPoint(svgElement, event);
											if (coords == null) {
												return;
											}
											const tooltipText =
												duration != null
													? `${displayName}\n${formatDuration(duration)}`
													: displayName;
											showTooltip({
												tooltipData: tooltipText,
												tooltipTop: coords.y + 10,
												tooltipLeft: coords.x + 10
											});
										}

										return (
											<g key={i}>
												<BarRounded
													width={x1 - x0}
													height={y1 - y0}
													x={x0}
													y={y0}
													radius={3}
													all
													fill="#3b82f6"
													onPointerMove={handleNodeTooltip}
													onMouseOut={hideTooltip}
												/>
												<text
													x={isRightSide ? x1 + 6 : x0 - 6}
													y={(y0 + y1) / 2}
													dy="0.35em"
													textAnchor={isRightSide ? 'start' : 'end'}
													fontSize={12}
													fill="#374151"
													onPointerMove={handleNodeTooltip}
													onMouseOut={hideTooltip}
													style={{ cursor: 'help' }}
												>
													{truncatedName}
												</text>
											</g>
										);
									})}
								</Group>
							</>
						)}
					</Sankey>
				</svg>
				{tooltipOpen && tooltipData != null && (
					<TooltipWithBounds top={tooltipTop} left={tooltipLeft}>
						<div style={{ whiteSpace: 'pre-line' }}>{tooltipData}</div>
					</TooltipWithBounds>
				)}
			</div>
		</div>
	);
};

function aggregateActivityData(entries: specta.ActivityEntry[]): {
	appMap: Map<string, number>;
	windowMap: Map<string, { app: string; duration: number }>;
} {
	const appMap = new Map<string, number>();
	const windowMap = new Map<string, { app: string; duration: number }>();

	for (const entry of entries) {
		const duration = entry.endTime - entry.startTime;
		const app = entry.application;
		const window = entry.windowTitle ?? 'Untitled';

		appMap.set(app, (appMap.get(app) ?? 0) + duration);

		const windowKey = `${app}::${window}`;
		const existing = windowMap.get(windowKey);
		windowMap.set(windowKey, {
			app,
			duration: (existing?.duration ?? 0) + duration
		});
	}

	return { appMap, windowMap };
}

function createAppNodes(appMap: Map<string, number>, nodes: TNodeDatum[]): TAppNode[] {
	return Array.from(appMap.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([app, duration]) => {
			const index = nodes.length;
			nodes.push({ name: app, duration });
			return { app, index };
		});
}

function groupWindowsByApp(
	windowMap: Map<string, { app: string; duration: number }>
): Map<string, TWindowData[]> {
	const windowsByApp = new Map<string, TWindowData[]>();

	for (const [windowKey, data] of windowMap.entries()) {
		const windows = windowsByApp.get(data.app) ?? [];
		const windowTitle = windowKey.split('::')[1] ?? 'Untitled';
		windows.push({ windowKey, windowTitle, duration: data.duration });
		windowsByApp.set(data.app, windows);
	}

	return windowsByApp;
}

function createWindowNodes(
	appNodes: TAppNode[],
	windowsByApp: Map<string, TWindowData[]>,
	maxWindowsPerApp: number,
	nodes: TNodeDatum[]
): { windowNodes: TWindowNode[]; restNodes: TRestNode[] } {
	const windowNodes: TWindowNode[] = [];
	const restNodes: TRestNode[] = [];

	for (const appNode of appNodes) {
		const windows = windowsByApp.get(appNode.app) ?? [];
		const sortedWindows = [...windows].sort((a, b) => b.duration - a.duration);
		const topWindows = sortedWindows.slice(0, maxWindowsPerApp);
		const restWindows = sortedWindows.slice(maxWindowsPerApp);
		const restDuration = restWindows.reduce((sum, w) => sum + w.duration, 0);

		for (const window of topWindows) {
			const windowName = `${appNode.app} - ${window.windowTitle}`;
			const index = nodes.length;
			nodes.push({ name: windowName, duration: window.duration });
			windowNodes.push({
				windowKey: window.windowKey,
				windowName,
				app: appNode.app,
				index,
				duration: window.duration
			});
		}

		if (restDuration > 0) {
			const restName = `${appNode.app} - Rest (${restWindows.length} more)`;
			const index = nodes.length;
			nodes.push({ name: restName, duration: restDuration });
			restNodes.push({ app: appNode.app, index, duration: restDuration });
		}
	}

	return { windowNodes, restNodes };
}

function createLinks(
	appNodes: TAppNode[],
	windowNodes: TWindowNode[],
	restNodes: TRestNode[],
	appMap: Map<string, number>
): TLink[] {
	const links: TLink[] = [];
	const totalNodeIndex = 0;

	for (const appNode of appNodes) {
		const appDuration = appMap.get(appNode.app) ?? 0;
		if (appDuration > 0) {
			links.push({
				source: totalNodeIndex,
				target: appNode.index,
				value: appDuration
			});
		}
	}

	for (const windowNode of windowNodes) {
		const appNode = appNodes.find((n) => n.app === windowNode.app);
		if (appNode == null || windowNode.duration <= 0) {
			continue;
		}
		links.push({
			source: appNode.index,
			target: windowNode.index,
			value: windowNode.duration
		});
	}

	for (const restNode of restNodes) {
		const appNode = appNodes.find((n) => n.app === restNode.app);
		if (appNode == null || restNode.duration <= 0) {
			continue;
		}
		links.push({
			source: appNode.index,
			target: restNode.index,
			value: restNode.duration
		});
	}

	return links;
}

function buildSankeyData(
	entries: specta.ActivityEntry[],
	maxWindowsPerApp: number = 5
): TSankeyData {
	const totalDuration = entries.reduce((sum, entry) => sum + (entry.endTime - entry.startTime), 0);
	const nodes: TNodeDatum[] = [{ name: 'Total Time', duration: totalDuration }];
	const { appMap, windowMap } = aggregateActivityData(entries);
	const appNodes = createAppNodes(appMap, nodes);
	const windowsByApp = groupWindowsByApp(windowMap);
	const { windowNodes, restNodes } = createWindowNodes(
		appNodes,
		windowsByApp,
		maxWindowsPerApp,
		nodes
	);
	const links = createLinks(appNodes, windowNodes, restNodes, appMap);

	return { nodes, links };
}

function trimAppPrefix(name: string): string {
	if (!name.includes(' - ')) {
		return name;
	}
	return name.split(' - ').slice(1).join(' - ');
}

function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength - 3)}...`;
}

function handleMaxWindowsChange(
	value: string,
	setMaxWindows: React.Dispatch<React.SetStateAction<number>>
): void {
	const numValue = Number(value);
	if (isNaN(numValue)) {
		return;
	}
	setMaxWindows(Math.max(1, Math.min(20, numValue)));
}

interface TSankeyDiagramProps {
	entries: specta.ActivityEntry[];
	width?: number;
	height?: number;
	maxWindowsPerApp?: number;
}

interface TNodeDatum {
	name: string;
	duration?: number;
}

interface TLinkDatum {}

interface TLink {
	source: number;
	target: number;
	value: number;
}

interface TWindowData {
	windowKey: string;
	windowTitle: string;
	duration: number;
}

interface TAppNode {
	app: string;
	index: number;
}

interface TWindowNode {
	windowKey: string;
	windowName: string;
	app: string;
	index: number;
	duration: number;
}

interface TRestNode {
	app: string;
	index: number;
	duration: number;
}

interface TSankeyData {
	nodes: TNodeDatum[];
	links: TLink[];
}
