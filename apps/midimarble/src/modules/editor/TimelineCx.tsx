import React from 'react';
import type { TRuntimeApp } from '@/modules/engine';
import { useEditorCx } from './EditorCx';
import { collectTimelineContributorDependencies, collectTimelineViewModel } from './timeline-model';
import type {
	TTimelineContributor,
	TTimelineItem,
	TTimelineUi,
	TTimelineView,
	TTimelineViewModel
} from './types';

const TRANSPORT_VIEW_ID = 'transport';

type TTimelineContributors = Map<string, TTimelineContributor>;

const transportContributor: TTimelineContributor = {
	order: 0,
	getViews() {
		return [{ id: TRANSPORT_VIEW_ID, label: 'Transport', order: 0 }];
	},
	getItems() {
		return [];
	}
};

const ReactTimelineCx = React.createContext<TTimelineCxValue | null>(null);

export const TimelineCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [timelineUi, setTimelineUi] = React.useState<TTimelineUi>({
		activeViewId: TRANSPORT_VIEW_ID,
		pixelsPerSecond: 80
	});
	const [contributors, setContributors] = React.useState<TTimelineContributors>(
		() => new Map([['physics.transport', transportContributor]])
	);

	const value = React.useMemo<TTimelineCxValue>(
		() => ({
			timelineUi,
			contributors,
			setActiveViewId(viewId: string) {
				setTimelineUi((current) => ({ ...current, activeViewId: viewId }));
			},
			setPixelsPerSecond(pixelsPerSecond: number) {
				setTimelineUi((current) => ({ ...current, pixelsPerSecond }));
			},
			registerContributor(id: string, contributor: TTimelineContributor) {
				setContributors((current) => {
					const next = new Map(current);
					next.set(id, contributor);
					return next;
				});
			},
			unregisterContributor(id: string) {
				setContributors((current) => {
					if (!current.has(id)) {
						return current;
					}

					const next = new Map(current);
					next.delete(id);
					return next;
				});
			}
		}),
		[contributors, timelineUi]
	);

	return <ReactTimelineCx.Provider value={value}>{children}</ReactTimelineCx.Provider>;
};

export function useTimelineCx(): TTimelineCxValue {
	const cx = React.useContext(ReactTimelineCx);
	if (cx == null) {
		throw new Error('useTimelineCx must be used within TimelineCxProvider');
	}
	return cx;
}

export function useTimelineViewModel(): TTimelineViewModel {
	const app = useEditorCx().runtime.app;
	const { contributors, timelineUi } = useTimelineCx();
	const contributorsRevision = useTimelineContributorsRevision(app, contributors);

	return React.useMemo(
		() => collectTimelineViewModel(app, contributors, timelineUi.activeViewId, TRANSPORT_VIEW_ID),
		[app, contributors, contributorsRevision, timelineUi.activeViewId]
	);
}

function useTimelineContributorsRevision(
	app: TRuntimeApp,
	contributors: TTimelineContributors
): number {
	const [revision, bumpRevision] = React.useReducer((count) => count + 1, 0);

	React.useEffect(() => {
		const { resourceKeys, componentRefs } = collectTimelineContributorDependencies(
			contributors.values()
		);

		const unbinds: Array<() => void> = [];
		for (const resourceKey of resourceKeys) {
			unbinds.push(
				app._resourceRegistry.onAdd(resourceKey, bumpRevision),
				app._resourceRegistry.onChange(resourceKey, bumpRevision)
			);
		}
		for (const componentRef of componentRefs) {
			unbinds.push(
				app._componentRegistry.onAdd(componentRef, bumpRevision),
				app._componentRegistry.onChange(componentRef, bumpRevision),
				app._componentRegistry.onRemove(componentRef, bumpRevision)
			);
		}

		return () => {
			for (const unbind of unbinds) {
				unbind();
			}
		};
	}, [app, contributors]);

	return revision;
}

interface TTimelineCxValue {
	timelineUi: TTimelineUi;
	contributors: TTimelineContributors;
	setActiveViewId(viewId: string): void;
	setPixelsPerSecond(pixelsPerSecond: number): void;
	registerContributor(id: string, contributor: TTimelineContributor): void;
	unregisterContributor(id: string): void;
}

export type { TTimelineContributor, TTimelineItem, TTimelineUi, TTimelineView, TTimelineViewModel };
