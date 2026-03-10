import { Entity, With } from 'ecsify';
import { useQueryComponents } from '@/modules/engine';
import { useEditorCx } from '../EditorCx';

export function useCubeRotation(): TCubeRotation | null {
	const app = useEditorCx().runtime.app;
	const values = useQueryComponents(app, {
		components: [Entity, app.c.Rotation] as const,
		queryOrFilter: With(app.c.PrimaryCube),
		watchComponents: [app.c.PrimaryCube, app.c.Rotation]
	});

	if (!values.length) {
		return null;
	}

	const first = values[0];
	if (first == null) {
		return null;
	}

	const [, rotation] = first;
	return { x: rotation.x, y: rotation.y, z: rotation.z };
}

interface TCubeRotation {
	x: number;
	y: number;
	z: number;
}
