import { Entity, With } from 'ecsify';
import { useQueryComponents } from '@/modules/engine';
import { useEditorCx } from '../EditorCx';

export function useSceneSummary(): TSceneSummary {
	const app = useEditorCx().runtime.app;
	const values = useQueryComponents(app, {
		components: [Entity, app.c.MeshMixin, app.c.PositionMixin] as const,
		queryOrFilter: With(app.c.MeshMixin),
		watchComponents: [app.c.MeshMixin, app.c.PositionMixin]
	});

	const marbleCount = values.filter(([, mesh]) => mesh.ref === 'marble').length;
	const pegboardCount = values.filter(([, mesh]) => mesh.ref === 'pegboard').length;
	const leadMarble = values.find(([, mesh]) => mesh.ref === 'marble');

	return {
		entityCount: values.length,
		marbleCount,
		pegboardCount,
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
	pegboardCount: number;
	leadMarblePosition: TVec3 | null;
}
