import { elapsedTimeSystem } from './systems';
import type { TCoreApp, TCorePlugin, TSpawnSpatialOptions } from './types';

export function createCorePlugin(): TCorePlugin {
	return {
		name: 'Core',
		deps: ['Default'],
		components: {
			// Mixins
			PositionMixin: [],
			RotationMixin: [],
			ScaleMixin: []
		},
		resources: {
			elapsedSeconds: 0
		},
		appExtensions: {
			spawnSpatial(this: TCoreApp, options: TSpawnSpatialOptions): number {
				const eid = this.createEntity();
				this.addComponent(eid, this.c.PositionMixin, {
					x: options.position?.x ?? 0,
					y: options.position?.y ?? 0,
					z: options.position?.z ?? 0
				});
				this.addComponent(eid, this.c.RotationMixin, {
					x: options.rotation?.x ?? 0,
					y: options.rotation?.y ?? 0,
					z: options.rotation?.z ?? 0
				});
				this.addComponent(eid, this.c.ScaleMixin, {
					x: options.scale?.x ?? 1,
					y: options.scale?.y ?? 1,
					z: options.scale?.z ?? 1
				});
				return eid;
			}
		},
		setup(app) {
			app.addSystem(elapsedTimeSystem, { set: 'Update' });
		}
	};
}
