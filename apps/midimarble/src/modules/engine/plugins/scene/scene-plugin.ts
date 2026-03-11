import {
	createMarbleBundle,
	createPegboardBundle,
	createStraightTrackBundle
} from './scene-bundles';
import type { TSceneApp, TScenePlugin } from './types';

export function createScenePlugin(): TScenePlugin {
	return {
		name: 'Scene',
		deps: ['Default', 'Core', 'Physics', 'Render'],
		components: {
			MarbleMixin: [],
			StraightTrackMixin: [],
			PegboardMixin: []
		},
		setup(app: TSceneApp) {
			seedScene(app);
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
	app.spawnBundle(createMarbleBundle(app, { position: { x: -7.25, y: 18.4, z: -25.2 } }));
}
