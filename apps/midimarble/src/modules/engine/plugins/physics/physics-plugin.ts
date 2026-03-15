import * as RAPIER from '@dimforge/rapier3d-compat';
import { physicsConfig } from './config';
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
			fixedTimeStepSeconds: physicsConfig.timeStepSeconds,
			bufferedStep: 0,
			liveStep: 0,
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
			},
			setSimulationResumeWhenReady(this: TPhysicsApp, resumeWhenReady: boolean): boolean {
				if (this.r.simulationSync.mode === 'idle') {
					return false;
				}

				if (this.r.simulationSync.resumeWhenReady === resumeWhenReady) {
					return true;
				}

				this.updateResource('simulationSync', {
					...this.r.simulationSync,
					resumeWhenReady
				});
				return true;
			}
		},
		setup(app: TPhysicsApp) {
			void initPromise.then(() => {
				app.updateResource('rapier', RAPIER);
				const world = new RAPIER.World(physicsConfig.gravity);
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
