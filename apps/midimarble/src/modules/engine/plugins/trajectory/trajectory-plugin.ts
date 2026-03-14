import { buildTrajectoryLine, MAX_TRAJECTORY_STEPS } from './lib/line-state';
import { updateTrajectorySystem } from './systems';
import type { TTrajectoryApp, TTrajectoryPlugin } from './types';

export function createTrajectoryPlugin(): TTrajectoryPlugin {
	const futureBuffer = new Float32Array(MAX_TRAJECTORY_STEPS * 3);
	const pastBuffer = new Float32Array(MAX_TRAJECTORY_STEPS * 3);
	const futureColor = '#4a90e2';
	const pastColor = '#ff9943';

	return {
		// Trajectory is a separate debug/inspection layer driven by physics state.
		name: 'Trajectory',
		deps: ['Default', 'Core', 'Physics', 'Render'],
		components: {
			TrajectorySourceTag: []
		},
		resources: {
			trajectoryConfig: {
				futureSteps: 120,
				pastSteps: 120,
				enabled: true,
				futureColor,
				pastColor
			},
			trajectoryLines: {
				futureLine: buildTrajectoryLine(futureBuffer, futureColor),
				pastLine: buildTrajectoryLine(pastBuffer, pastColor),
				futureBuffer,
				pastBuffer
			}
		},
		setup(app: TTrajectoryApp) {
			const { futureLine, pastLine } = app.r.trajectoryLines;

			const futureEid = app.createEntity();
			app.addComponent(futureEid, app.c.MeshMixin, { type: 'three', object: futureLine });

			const pastEid = app.createEntity();
			app.addComponent(pastEid, app.c.MeshMixin, { type: 'three', object: pastLine });

			app.addSystem(updateTrajectorySystem, { set: 'PostUpdate' });
		}
	};
}
