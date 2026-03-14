import * as RAPIER from '@dimforge/rapier3d-compat';
import { markSimulationDirty, requestSimulationSync } from './lib/simulation-sync';
import {
	advanceSimulationSyncSystem,
	beginSimulationSyncSystem,
	cleanupOrphanedPhysicsBodiesSystem,
	preloadPhysicsWorldSystem,
	spawnRigidBodiesSystem,
	stepPhysicsWorldSystem,
	syncDynamicBodiesToComponentsSystem,
	syncLiveWorldToTransportSystem,
	syncNonDynamicBodiesFromComponentsSystem
} from './systems';
import type { TPhysicsApp, TPhysicsPlugin } from './types';

export function createPhysicsPlugin(): TPhysicsPlugin {
	const initPromise = RAPIER.init();

	return {
		// Physics owns simulation state, stepping, checkpoints, and resync.
		name: 'Physics',
		deps: ['Default', 'Core', 'Midi', 'Transport'],
		components: {
			RigidBodyMixin: [],
			ColliderMixin: []
		},
		resources: {
			rapier: null,
			world: null,
			preloadWorld: null,
			isReady: false,
			fixedTimeStepSeconds: 1 / 240,
			bufferedStep: 0,
			liveStep: 0,
			simulationConfig: {
				checkpointIntervalSteps: 60,
				preloadHorizonSteps: 2400,
				maxPreloadStepsPerUpdate: 120,
				maxLiveStepsPerUpdate: 12,
				maxSyncStepsPerUpdate: 240
			},
			checkpointStore: new Map(),
			preloadStep: 0,
			rigidBodies: new Map(),
			colliders: new Map(),
			simulationSync: {
				mode: 'idle'
			}
		},
		appExtensions: {
			markSimulationDirty(this: TPhysicsApp): void {
				markSimulationDirty(this);
			},
			requestSimulationSync(this: TPhysicsApp): void {
				requestSimulationSync(this);
			}
		},
		setup(app: TPhysicsApp) {
			void initPromise.then(() => {
				app.updateResource('rapier', RAPIER);
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
			app.addSystem(beginSimulationSyncSystem, {
				set: 'Update',
				after: syncNonDynamicBodiesFromComponentsSystem
			});
			app.addSystem(syncLiveWorldToTransportSystem, {
				set: 'Update',
				after: beginSimulationSyncSystem
			});
			app.addSystem(stepPhysicsWorldSystem, {
				set: 'Update',
				after: syncLiveWorldToTransportSystem
			});
			app.addSystem(advanceSimulationSyncSystem, {
				set: 'Update',
				after: stepPhysicsWorldSystem
			});
			app.addSystem(preloadPhysicsWorldSystem, {
				set: 'Update',
				after: advanceSimulationSyncSystem
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
