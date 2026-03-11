import { Entity, With } from 'ecsify';
import { useQueryComponents } from '@/modules/engine';
import { useEditorCx } from '../EditorCx';

export function useSceneSummary(): TSceneSummary {
	const app = useEditorCx().runtime.app;
	const marbles = useQueryComponents(app, {
		components: [Entity, app.c.MarbleMixin, app.c.PositionMixin] as const,
		queryOrFilter: With(app.c.MarbleMixin),
		watchComponents: [app.c.MarbleMixin, app.c.PositionMixin]
	});
	const straightTracks = useQueryComponents(app, {
		components: [Entity] as const,
		queryOrFilter: With(app.c.StraightTrackMixin),
		watchComponents: [app.c.StraightTrackMixin]
	});
	const pegboards = useQueryComponents(app, {
		components: [Entity] as const,
		queryOrFilter: With(app.c.PegboardMixin),
		watchComponents: [app.c.PegboardMixin]
	});

	const leadMarble = marbles[0];

	return {
		entityCount: marbles.length + straightTracks.length + pegboards.length,
		marbleCount: marbles.length,
		straightTrackCount: straightTracks.length,
		pegboardCount: pegboards.length,
		physicsReady: app.r.isReady,
		leadMarblePosition:
			leadMarble == null
				? null
				: {
						x: leadMarble[2].x,
						y: leadMarble[2].y,
						z: leadMarble[2].z
					}
	};
}

interface TVec3 {
	x: number;
	y: number;
	z: number;
}

interface TSceneSummary {
	entityCount: number;
	marbleCount: number;
	straightTrackCount: number;
	pegboardCount: number;
	physicsReady: boolean;
	leadMarblePosition: TVec3 | null;
}
