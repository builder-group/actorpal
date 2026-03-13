import {
	createMarbleBundle,
	createPegboardBundle,
	createStraightTrackBundle
} from './scene-bundles';
import { syncStraightTrackGeometrySystem } from './systems';
import type { TSceneApp, TScenePlugin } from './types';
import { spawnRigidBodiesSystem } from '../physics/systems';

export const MARBLE_SPAWN_POSITION = { x: -7.25, y: 18.4, z: -25.2 };

export function createScenePlugin(): TScenePlugin {
	return {
		name: 'Scene',
		deps: ['Default', 'Core', 'Physics', 'Render'],
		components: {
			MarbleMixin: [],
			StraightTrackMixin: [],
			StraightTrackGeometryMixin: [],
			PegboardMixin: []
		},
		resources: {
			straightTrackGeometrySignatures: new Map()
		},
		setup(app: TSceneApp) {
			seedScene(app);
			app.addSystem(syncStraightTrackGeometrySystem, {
				set: 'First',
				after: spawnRigidBodiesSystem as unknown as (app: TSceneApp) => void
			});
		}
	};
}

function seedScene(app: TSceneApp): void {
	app.spawnBundle(createPegboardBundle(app));
	app.spawnBundle(
		createStraightTrackBundle(app, {
			position: { x: -7.25, y: 16, z: -18 },
			rotation: { x: 0.28, y: 0, z: 0 },
			length: 16
		})
	);
	app.spawnBundle(
		createStraightTrackBundle(app, {
			position: { x: -7.25, y: 10.9, z: -1.4 },
			rotation: { x: -0.1, y: 0, z: 0 },
			length: 14
		})
	);
	app.spawnBundle(
		createStraightTrackBundle(app, {
			position: { x: -7.25, y: 4.2, z: 12.8 },
			rotation: { x: 0.22, y: 0, z: 0 },
			length: 12
		})
	);
	app.spawnBundle(createMarbleBundle(app, { position: MARBLE_SPAWN_POSITION }));
}
