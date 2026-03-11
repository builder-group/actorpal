import { TBundle } from 'ecsify';
import { elapsedTimeSystem } from './systems';
import type { TCoreApp, TCorePlugin } from './types';

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
			spawnBundle(this: TCoreApp, bundle: TBundle): number {
				const eid = this.createEntity();
				this.addBundle(eid, bundle);
				return eid;
			}
		},
		setup(app) {
			app.addSystem(elapsedTimeSystem, { set: 'Update' });
		}
	};
}
