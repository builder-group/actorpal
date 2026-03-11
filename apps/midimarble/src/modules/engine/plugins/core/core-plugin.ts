import { flattenBundle, TBundle } from './bundle';
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
			insertBundle(this: TCoreApp, eid: number, bundle: TBundle): void {
				for (const entry of flattenBundle(bundle)) {
					const { component, value } = entry;
					if (value === undefined) {
						this.addComponent(eid, component);
						continue;
					}

					if (this.hasComponent(eid, component)) {
						this.updateComponent(eid, component, value as never);
						continue;
					}

					this.addComponent(eid, component, value as never);
				}
			},
			spawnBundle(this: TCoreApp, bundle: TBundle): number {
				const eid = this.createEntity();
				this.insertBundle(eid, bundle);
				return eid;
			}
		},
		setup(app) {
			app.addSystem(elapsedTimeSystem, { set: 'Update' });
		}
	};
}
