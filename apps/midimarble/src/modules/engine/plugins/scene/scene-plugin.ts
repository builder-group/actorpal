import { animateFallingMarblesSystem } from './systems';
import type { TSceneApp, TScenePlugin, TSpawnDemoMarbleOptions } from './types';

export function createScenePlugin(): TScenePlugin {
	return {
		name: 'Scene',
		deps: ['Default', 'Core', 'Render'],
		components: {
			// Mixins
			FallingMarbleMixin: []
		},
		appExtensions: {
			spawnPegboard(this: TSceneApp): number {
				return this.spawnRenderable({
					meshRef: 'pegboard',
					position: { x: 0, y: 0, z: 0 },
					rotation: { x: 0, y: Math.PI / 2, z: 0 },
					scale: { x: 1, y: 1, z: 1 }
				});
			},
			spawnDemoMarble(this: TSceneApp, options: TSpawnDemoMarbleOptions): number {
				const eid = this.spawnRenderable({
					meshRef: 'marble',
					position: { x: options.x, y: options.startY, z: options.z },
					scale: { x: 0.7, y: 0.7, z: 0.7 }
				});

				this.addComponent(eid, this.c.FallingMarbleMixin, {
					speed: options.speed,
					startY: options.startY,
					resetY: options.resetY,
					spinX: options.spin.x,
					spinY: options.spin.y,
					spinZ: options.spin.z
				});

				return eid;
			}
		},
		setup(app: TSceneApp) {
			seedScene(app);
			app.addSystem(animateFallingMarblesSystem, { set: 'Update' });
		}
	};
}

function seedScene(app: TSceneApp): void {
	app.spawnPegboard();

	const marbleOffsets = [-12, -6, 0, 6, 12];
	for (const [index, z] of marbleOffsets.entries()) {
		app.spawnDemoMarble({
			x: 0.9,
			z,
			startY: 40 + index * 10,
			speed: 22 + index * 2.5,
			resetY: -96,
			spin: {
				x: 0.6 + index * 0.15,
				y: 0.8 + index * 0.12,
				z: 0.2 + index * 0.08
			}
		});
	}
}
