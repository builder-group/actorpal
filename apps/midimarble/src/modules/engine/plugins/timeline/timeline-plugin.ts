import type {
	TTimelineApp,
	TTimelineContributor,
	TTimelineItem,
	TTimelinePlugin,
	TTimelineView,
	TTimelineViewModel
} from './types';

const TRANSPORT_VIEW_ID = 'transport';

const transportContributor: TTimelineContributor = {
	order: 0,
	getViews(): TTimelineView[] {
		return [{ id: TRANSPORT_VIEW_ID, label: 'Transport', order: 0 }];
	},
	getItems(): TTimelineItem[] {
		return [];
	}
};

export function createTimelinePlugin(): TTimelinePlugin {
	return {
		name: 'Timeline',
		deps: ['Default', 'Core', 'Physics'],
		resources: {
			timelineUi: {
				activeViewId: TRANSPORT_VIEW_ID,
				pixelsPerSecond: 80,
				scrollLeftPx: 0
			},
			timelineContributors: new Map([['physics.transport', transportContributor]])
		},
		appExtensions: {
			registerTimelineContributor(
				this: TTimelineApp,
				id: string,
				contributor: TTimelineContributor
			): void {
				const timelineContributors = new Map(this.r.timelineContributors);
				timelineContributors.set(id, contributor);
				this.updateResource('timelineContributors', timelineContributors);
			},
			unregisterTimelineContributor(this: TTimelineApp, id: string): void {
				if (!this.r.timelineContributors.has(id)) {
					return;
				}

				const timelineContributors = new Map(this.r.timelineContributors);
				timelineContributors.delete(id);
				this.updateResource('timelineContributors', timelineContributors);

				const viewModel = collectTimelineViewModel(this);
				if (viewModel.activeViewId !== this.r.timelineUi.activeViewId) {
					this.updateResource('timelineUi', {
						...this.r.timelineUi,
						activeViewId: viewModel.activeViewId
					});
				}
			},
			setActiveTimelineView(this: TTimelineApp, viewId: string): void {
				if (this.r.timelineUi.activeViewId === viewId) {
					return;
				}

				const viewModel = collectTimelineViewModel(this);
				if (!viewModel.views.some((view) => view.id === viewId)) {
					return;
				}

				this.updateResource('timelineUi', {
					...this.r.timelineUi,
					activeViewId: viewId
				});
			},
			getTimelineViewModel(this: TTimelineApp): TTimelineViewModel {
				return collectTimelineViewModel(this);
			}
		}
	};
}

function collectTimelineViewModel(app: TTimelineApp): TTimelineViewModel {
	const contributors = [...app.r.timelineContributors.entries()].sort((a, b) => {
		const aOrder = a[1].order ?? 0;
		const bOrder = b[1].order ?? 0;
		return aOrder - bOrder || a[0].localeCompare(b[0]);
	});

	const viewsById = new Map<string, TTimelineView>();
	for (const [, contributor] of contributors) {
		for (const view of contributor.getViews(app)) {
			const existing = viewsById.get(view.id);
			if (existing == null || view.order < existing.order) {
				viewsById.set(view.id, view);
			}
		}
	}

	const views = [...viewsById.values()].sort(
		(a, b) => a.order - b.order || a.label.localeCompare(b.label)
	);
	const activeViewId =
		views.find((view) => view.id === app.r.timelineUi.activeViewId)?.id ?? views[0]?.id ?? TRANSPORT_VIEW_ID;

	const items: TTimelineItem[] = [];
	for (const [, contributor] of contributors) {
		const contributorItems = contributor.getItems?.(app, activeViewId) ?? [];
		items.push(...contributorItems);
	}

	items.sort((a, b) => {
		const aTime = a.type === 'point' ? a.timeSeconds : a.startSeconds;
		const bTime = b.type === 'point' ? b.timeSeconds : b.startSeconds;
		return aTime - bTime || a.id.localeCompare(b.id);
	});

	return { views, activeViewId, items };
}
