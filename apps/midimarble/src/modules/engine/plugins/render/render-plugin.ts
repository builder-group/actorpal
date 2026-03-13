import { Viewport } from './lib/Viewport';
import {
	cleanupOrphanedThreeObjectsSystem,
	mountThreeObjectsSystem,
	renderFrameSystem,
	syncThreeObjectTransformsSystem
} from './systems';
import type { TRenderApp, TRenderPlugin } from './types';

export function createRenderPlugin(): TRenderPlugin {
	const viewport = new Viewport();

	return {
		// Render owns viewport lifecycle and mounted scene objects only.
		name: 'Render',
		deps: ['Default', 'Core'],
		components: {
			// Mixins
			MeshMixin: []
		},
		resources: {
			viewport,
			sceneObjects: new Map()
		},
		appExtensions: {
			setRenderContainer(this: TRenderApp, container: HTMLDivElement | null): void {
				this.r.viewport.setContainer(container);
			},
			disposeRender(this: TRenderApp): void {
				this.r.sceneObjects.clear();
				this.r.viewport.dispose();
			}
		},
		setup(app: TRenderApp) {
			app.addSystem(mountThreeObjectsSystem, { set: 'First' });
			app.addSystem(syncThreeObjectTransformsSystem, { set: 'PostUpdate' });
			app.addSystem(cleanupOrphanedThreeObjectsSystem, {
				set: 'Last',
				after: syncThreeObjectTransformsSystem
			});
			app.addSystem(renderFrameSystem, { set: 'Last', after: cleanupOrphanedThreeObjectsSystem });
		}
	};
}
