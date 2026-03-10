import { Viewport } from './lib';
import {
	cleanupOrphanedMeshObjectsSystem,
	renderFrameSystem,
	spawnMeshObjectsSystem,
	syncMeshTransformsSystem
} from './systems';
import type { TRenderApp, TRenderPlugin, TSpawnRenderableOptions } from './types';

export function createRenderPlugin(): TRenderPlugin {
	const viewport = new Viewport();

	return {
		name: 'Render',
		deps: ['Default', 'Core'],
		components: {
			// Mixins
			MeshMixin: []
		},
		resources: {
			viewport,
			meshObjects: new Map()
		},
		appExtensions: {
			spawnRenderable(this: TRenderApp, options: TSpawnRenderableOptions): number {
				const eid = this.spawnSpatial(options);
				this.addComponent(eid, this.c.MeshMixin, { ref: options.meshRef });
				return eid;
			},
			setRenderContainer(this: TRenderApp, container: HTMLDivElement | null): void {
				this.r.viewport.setContainer(container);
			},
			disposeRender(this: TRenderApp): void {
				this.r.meshObjects.clear();
				this.r.viewport.dispose();
			}
		},
		setup(app: TRenderApp) {
			app.addSystem(spawnMeshObjectsSystem, { set: 'Update' });
			app.addSystem(syncMeshTransformsSystem, { set: 'Update' });
			app.addSystem(cleanupOrphanedMeshObjectsSystem, {
				set: 'Last',
				after: syncMeshTransformsSystem
			});
			app.addSystem(renderFrameSystem, { set: 'Last', after: syncMeshTransformsSystem });
		}
	};
}
