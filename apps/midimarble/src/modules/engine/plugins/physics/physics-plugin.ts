import * as RAPIER from '@dimforge/rapier3d-compat';
import {
	cleanupOrphanedPhysicsBodiesSystem,
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
			isReady: false,
			accumulatorSeconds: 0,
			fixedTimeStepSeconds: 1 / 240,
			rigidBodies: new Map(),
			colliders: new Map()
		},
		setup(app: TPhysicsApp) {
			void initPromise.then(() => {
				app.r.rapier = RAPIER;
				app.r.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
				app.r.world.timestep = app.r.fixedTimeStepSeconds;
				app.r.isReady = true;
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
			app.addSystem(syncDynamicBodiesToComponentsSystem, {
				set: 'Update',
				after: stepPhysicsWorldSystem
			});
			app.addSystem(cleanupOrphanedPhysicsBodiesSystem, {
				set: 'Last',
				after: syncDynamicBodiesToComponentsSystem
			});
		}
	};
}
