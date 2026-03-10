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
					position: { x: 0, y: 1.2, z: -1.4 },
					scale: { x: 9.5, y: 14.5, z: 0.5 }
				});
			},
			spawnDemoMarble(this: TSceneApp, options: TSpawnDemoMarbleOptions): number {
				const eid = this.spawnRenderable({
					meshRef: 'marble',
					position: { x: options.x, y: options.startY, z: options.z },
					scale: { x: 0.18, y: 0.18, z: 0.18 }
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

	const marbleOffsets = [-1.7, -0.85, 0, 0.85, 1.7];
	for (const [index, x] of marbleOffsets.entries()) {
		app.spawnDemoMarble({
			x,
			z: -0.15 + index * 0.08,
			startY: 3.8 + index * 1.15,
			speed: 1.8 + index * 0.18,
			resetY: -4.4,
			spin: {
				x: 0.6 + index * 0.15,
				y: 0.8 + index * 0.12,
				z: 0.2 + index * 0.08
			}
		});
	}
}
