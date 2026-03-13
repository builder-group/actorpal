import type { TApp, TAppContext, TDefaultPlugin, TPlugin } from 'ecsify';
import type { TCorePlugin } from '../core';
import type { TPhysicsPlugin } from '../physics';

export type TTimelinePlugin = TPlugin<
	{
		name: 'Timeline';
		resources: {
			timelineUi: TTimelineUi;
			timelineContributors: TTimelineContributors;
		};
		appExtensions: {
			registerTimelineContributor(id: string, contributor: TTimelineContributor): void;
			unregisterTimelineContributor(id: string): void;
			setActiveTimelineView(viewId: string): void;
			getTimelineViewModel(): TTimelineViewModel;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin, TPhysicsPlugin]
>;

export type TTimelineApp = TApp<
	TAppContext<[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TTimelinePlugin]>
>;

export interface TTimelineUi {
	activeViewId: string;
	pixelsPerSecond: number;
	scrollLeftPx: number;
}

export type TTimelineContributors = Map<string, TTimelineContributor>;

export interface TTimelineView {
	id: string;
	label: string;
	order: number;
}

export type TTimelineItem = TTimelinePointItem | TTimelineRangeItem;

interface TTimelineBaseItem {
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
	getViews(app: TTimelineApp): TTimelineView[];
	getItems?(app: TTimelineApp, viewId: string): TTimelineItem[];
}
