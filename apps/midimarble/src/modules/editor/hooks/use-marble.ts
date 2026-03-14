import { Entity, With } from 'ecsify';
import { useQueryComponents } from '@/modules/engine';
import { useEditorCx } from '../EditorCx';

export function useMarble(): TMarbleSummary {
	const app = useEditorCx().runtime.app;
	const marbles = useQueryComponents(app, {
		components: [Entity, app.c.PositionMixin] as const,
		queryOrFilter: With(app.c.MarbleTag),
		watchComponents: [app.c.MarbleTag, app.c.PositionMixin]
	});

	const leadMarble = marbles[0];

	return {
		position:
			leadMarble == null
				? null
				: {
						x: leadMarble[1].x,
						y: leadMarble[1].y,
						z: leadMarble[1].z
					}
	};
}

interface TVec3 {
	x: number;
	y: number;
	z: number;
}

interface TMarbleSummary {
	position: TVec3 | null;
}
