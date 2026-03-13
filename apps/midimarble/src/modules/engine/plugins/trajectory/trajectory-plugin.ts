import * as THREE from 'three';
import { updateTrajectorySystem } from './systems';
import type { TTrajectoryApp, TTrajectoryPlugin } from './types';

const MAX_TICKS = 1000;

function buildLine(buffer: Float32Array, color: string): THREE.Line {
	const geometry = new THREE.BufferGeometry();
	const attr = new THREE.BufferAttribute(buffer, 3);
	attr.setUsage(THREE.DynamicDrawUsage);
	geometry.setAttribute('position', attr);
	geometry.setDrawRange(0, 0);
	return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
}

export function createTrajectoryPlugin(): TTrajectoryPlugin {
	const futureBuffer = new Float32Array(MAX_TICKS * 3);
	const pastBuffer = new Float32Array(MAX_TICKS * 3);
	const futureColor = '#4a90e2';
	const pastColor = '#ff9943';

	return {
		name: 'Trajectory',
		deps: ['Default', 'Core', 'Physics', 'Render', 'Scene'],
		components: {
			TrajectoryLineMixin: []
		},
		resources: {
			trajectoryConfig: {
				futureTicks: 120,
				pastTicks: 120,
				enabled: true,
				futureColor,
				pastColor
			},
			trajectoryLines: {
				futureLine: buildLine(futureBuffer, futureColor),
				pastLine: buildLine(pastBuffer, pastColor),
				pastPositions: [],
				futureBuffer,
				pastBuffer,
				prevFutureColor: futureColor,
				prevPastColor: pastColor
			}
		},
		setup(app: TTrajectoryApp) {
			const { futureLine, pastLine } = app.r.trajectoryLines;

			const futureEid = app.createEntity();
			app.addComponent(futureEid, app.c.MeshMixin, { type: 'three', object: futureLine });
			app.addComponent(futureEid, app.c.TrajectoryLineMixin);

			const pastEid = app.createEntity();
			app.addComponent(pastEid, app.c.MeshMixin, { type: 'three', object: pastLine });
			app.addComponent(pastEid, app.c.TrajectoryLineMixin);

			app.addSystem(updateTrajectorySystem, { set: 'Update' });
		}
	};
}
