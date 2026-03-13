import { describe, expect, it } from 'vitest';
import { collectTimelineContributorDependencies, collectTimelineViewModel } from './timeline-model';
import type { TTimelineContributor } from './types';

describe('timeline model', () => {
	it('dedupes watched resources and components across contributors', () => {
		const componentA = { id: 'A' };
		const componentB = { id: 'B' };
		const contributors: TTimelineContributor[] = [
			{
				watchResources: ['simulationTransport', 'simulationConfig'],
				watchComponents: [componentA as never],
				getViews: () => []
			},
			{
				watchResources: ['simulationTransport'],
				watchComponents: [componentA as never, componentB as never],
				getViews: () => []
			}
		];

		const dependencies = collectTimelineContributorDependencies(contributors);

		expect(dependencies.resourceKeys).toEqual(['simulationTransport', 'simulationConfig']);
		expect(dependencies.componentRefs).toEqual([componentA, componentB]);
	});

	it('sorts views and items and normalizes the active view', () => {
		const contributors = new Map<string, TTimelineContributor>([
			[
				'scene',
				{
					order: 1,
					getViews: () => [
						{ id: 'scene', label: 'Scene', order: 1 },
						{ id: 'transport', label: 'Transport', order: 2 }
					],
					getItems: (_app, viewId) =>
						viewId === 'scene'
							? [
									{ id: 'b', type: 'point', timeSeconds: 4 },
									{ id: 'a', type: 'point', timeSeconds: 2 }
								]
							: []
				}
			],
			[
				'transport',
				{
					order: 0,
					getViews: () => [{ id: 'transport', label: 'Transport', order: 0 }],
					getItems: () => [{ id: 'c', type: 'range', startSeconds: 1, endSeconds: 3 }]
				}
			]
		]);

		const viewModel = collectTimelineViewModel(
			{} as never,
			contributors,
			'missing',
			'transport'
		);

		expect(viewModel.activeViewId).toBe('transport');
		expect(viewModel.views.map((view) => view.id)).toEqual(['transport', 'scene']);
		expect(viewModel.items.map((item) => item.id)).toEqual(['c']);
	});
});
