import * as RAPIER from '@dimforge/rapier3d-compat';
import {
	cleanupOrphanedPhysicsBodiesSystem,
	preloadPhysicsWorldSystem,
	spawnRigidBodiesSystem,
	stepPhysicsWorldSystem,
	syncDynamicBodiesToComponentsSystem,
	syncNonDynamicBodiesFromComponentsSystem
} from './systems';
import type { TPhysicsApp, TPhysicsPlugin } from './types';

export function createPhysicsPlugin(): TPhysicsPlugin {
	const initPromise = RAPIER.init();

	return {
		name: 'Physics',
		deps: ['Default', 'Core'],
		components: {
			RigidBodyMixin: [],
			ColliderMixin: []
		},
		resources: {
			rapier: null,
			world: null,
			preloadWorld: null,
			isReady: false,
			accumulatorSeconds: 0,
			fixedTimeStepSeconds: 1 / 240,
			simulationTransport: {
				mode: 'paused',
				playheadStep: 0,
				bufferedStep: 0,
				revision: 0
			},
			simulationConfig: {
				checkpointIntervalSteps: 60,
				preloadHorizonSteps: 2400,
				maxPreloadStepsPerUpdate: 120,
				maxLiveStepsPerUpdate: 12,
				maxDeltaSeconds: 0.05
			},
			checkpointStore: new Map(),
			preloadStep: 0,
			rigidBodies: new Map(),
			colliders: new Map()
		},
		setup(app: TPhysicsApp) {
			void initPromise.then(() => {
				app.r.rapier = RAPIER;
				const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
				world.timestep = app.r.fixedTimeStepSeconds;
				app.updateResource('world', world);
				app.updateResource('isReady', true);
			});

			app.addSystem(spawnRigidBodiesSystem, { set: 'First' });
			app.addSystem(syncNonDynamicBodiesFromComponentsSystem, {
				set: 'Update',
				after: spawnRigidBodiesSystem
			});
			app.addSystem(stepPhysicsWorldSystem, {
				set: 'Update',
				after: syncNonDynamicBodiesFromComponentsSystem
			});
			app.addSystem(preloadPhysicsWorldSystem, {
				set: 'Update',
				after: stepPhysicsWorldSystem
			});
			app.addSystem(syncDynamicBodiesToComponentsSystem, {
				set: 'Update',
				after: preloadPhysicsWorldSystem
			});
			app.addSystem(cleanupOrphanedPhysicsBodiesSystem, {
				set: 'Last',
				after: syncDynamicBodiesToComponentsSystem
			});
		}
	};
}
