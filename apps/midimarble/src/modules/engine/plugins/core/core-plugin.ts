import { TBundle } from 'ecsify';
import type { TCoreApp, TCorePlugin } from './types';

export function createCorePlugin(): TCorePlugin {
	return {
		// Core owns the shared runtime primitives other engine plugins build on.
		name: 'Core',
		deps: ['Default'],
		components: {
			// Mixins
			PositionMixin: [],
			RotationMixin: [],
			ScaleMixin: []
		},
		appExtensions: {
			spawnBundle(this: TCoreApp, bundle: TBundle): number {
				const eid = this.createEntity();
				this.addBundle(eid, bundle);
				return eid;
			}
		}
	};
}
