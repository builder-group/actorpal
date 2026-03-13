import type { TRuntimeApp } from '@/modules/engine';

export interface TTimelineUi {
	activeViewId: string;
	pixelsPerSecond: number;
}

export interface TTimelineView {
	id: string;
	label: string;
	order: number;
}

export type TTimelineItem = TTimelinePointItem | TTimelineRangeItem;

export interface TTimelineBaseItem {
	id: string;
	label?: string;
	color?: string;
	selectionId?: number;
}

export interface TTimelinePointItem extends TTimelineBaseItem {
	type: 'point';
	timeSeconds: number;
}

export interface TTimelineRangeItem extends TTimelineBaseItem {
	type: 'range';
	startSeconds: number;
	endSeconds: number;
}

export interface TTimelineViewModel {
	views: TTimelineView[];
	activeViewId: string;
	items: TTimelineItem[];
}

export interface TTimelineContributor {
	order?: number;
	watchResources?: Array<keyof TRuntimeApp['r']>;
	watchComponents?: Array<TRuntimeApp['c'][keyof TRuntimeApp['c']]>;
	getViews(app: TRuntimeApp): TTimelineView[];
	getItems?(app: TRuntimeApp, viewId: string): TTimelineItem[];
}
