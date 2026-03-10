import React from 'react';
import { useEditorCx } from '../EditorCx';

export function useCubeRotation(): TCubeRotation | null {
	const cx = useEditorCx();
	const [rotation, setRotation] = React.useState<TCubeRotation | null>(null);

	React.useEffect(() => {
		const { app } = cx.runtime;
		const readCubeRotation = (): TCubeRotation | null => {
			const { cubeEid } = app.r;
			if (cubeEid == null) {
				return null;
			}

			if (!app.hasComponent(cubeEid, app.c.Rotation)) {
				return null;
			}

			const x = app.c.Rotation.x[cubeEid];
			const y = app.c.Rotation.y[cubeEid];
			const z = app.c.Rotation.z[cubeEid];
			if (x == null || y == null || z == null) {
				return null;
			}

			return {
				x,
				y,
				z
			};
		};

		const syncFromEcs = () => {
			setRotation(readCubeRotation());
		};

		const onRotationChange = (eid: number) => {
			if (eid === app.r.cubeEid) {
				syncFromEcs();
			}
		};

		const onRotationAdd = (eid: number) => {
			if (eid === app.r.cubeEid) {
				syncFromEcs();
			}
		};

		const onRotationRemove = (eid: number) => {
			if (eid === app.r.cubeEid) {
				setRotation(null);
			}
		};

		const unbindChange = app._componentRegistry.onComponentChange(app.c.Rotation, onRotationChange);
		const unbindAdd = app._componentRegistry.onComponentAdd(app.c.Rotation, onRotationAdd);
		const unbindRemove = app._componentRegistry.onComponentRemove(app.c.Rotation, onRotationRemove);

		syncFromEcs();

		return () => {
			unbindChange();
			unbindAdd();
			unbindRemove();
		};
		}, [cx]);

	return rotation;
}

interface TCubeRotation {
	x: number;
	y: number;
	z: number;
}
