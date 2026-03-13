import type { TRuntimeApp } from '@/modules/engine';
import type { TTimelineContributor, TTimelineItem, TTimelineView, TTimelineViewModel } from './types';

export function collectTimelineViewModel(
	app: TRuntimeApp,
	contributors: Map<string, TTimelineContributor>,
	activeViewId: string,
	fallbackViewId: string
): TTimelineViewModel {
	const orderedContributors = [...contributors.entries()].sort((a, b) => {
		const aOrder = a[1].order ?? 0;
		const bOrder = b[1].order ?? 0;
		return aOrder - bOrder || a[0].localeCompare(b[0]);
	});

	const viewsById = new Map<string, TTimelineView>();
	for (const [, contributor] of orderedContributors) {
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
	const normalizedActiveViewId =
		views.find((view) => view.id === activeViewId)?.id ?? views[0]?.id ?? fallbackViewId;

	const items: TTimelineItem[] = [];
	for (const [, contributor] of orderedContributors) {
		const contributorItems = contributor.getItems?.(app, normalizedActiveViewId) ?? [];
		items.push(...contributorItems);
	}

	items.sort((a, b) => {
		const aTime = a.type === 'point' ? a.timeSeconds : a.startSeconds;
		const bTime = b.type === 'point' ? b.timeSeconds : b.startSeconds;
		return aTime - bTime || a.id.localeCompare(b.id);
	});

	return {
		views,
		activeViewId: normalizedActiveViewId,
		items
	};
}

export function collectTimelineContributorDependencies(
	contributors: Iterable<TTimelineContributor>
): {
	resourceKeys: Array<keyof TRuntimeApp['r']>;
	componentRefs: Array<TRuntimeApp['c'][keyof TRuntimeApp['c']]>;
} {
	const resourceKeys = new Set<keyof TRuntimeApp['r']>();
	const componentRefs = new Set<TRuntimeApp['c'][keyof TRuntimeApp['c']]>();

	for (const contributor of contributors) {
		for (const resourceKey of contributor.watchResources ?? []) {
			resourceKeys.add(resourceKey);
		}
		for (const componentRef of contributor.watchComponents ?? []) {
			componentRefs.add(componentRef);
		}
	}

	return {
		resourceKeys: [...resourceKeys],
		componentRefs: [...componentRefs]
	};
}
