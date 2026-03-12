import { initTrajectoryLinesSystem, updateTrajectorySystem } from './systems';
import type { TTrajectoryApp, TTrajectoryPlugin } from './types';

export function createTrajectoryPlugin(): TTrajectoryPlugin {
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
				futureColor: '#4a90e2',
				pastColor: '#ff9943'
			},
			trajectoryState: {
				initialized: false,
				futureLine: null,
				pastLine: null,
				pastPositions: [],
				futureBuffer: new Float32Array(0),
				pastBuffer: new Float32Array(0),
				prevFutureColor: '',
				prevPastColor: ''
			}
		},
		setup(app: TTrajectoryApp) {
			app.addSystem(initTrajectoryLinesSystem, { set: 'First' });
			app.addSystem(updateTrajectorySystem, { set: 'Update' });
		}
	};
}
