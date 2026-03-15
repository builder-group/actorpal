import { renderConfig } from './config';
import { enterPreview, exitPreview } from './lib/preview-camera';
import { Viewport } from './lib/Viewport';
import {
	cleanupOrphanedThreeObjectsSystem,
	mountThreeObjectsSystem,
	renderFrameSystem,
	syncPreviewCameraSystem,
	syncThreeObjectTransformsSystem
} from './systems';
import type { TRenderApp, TRenderPlugin } from './types';

export function createRenderPlugin(): TRenderPlugin {
	const viewport = new Viewport();

	return {
		// Render owns viewport lifecycle and mounted scene objects only.
		name: 'Render',
		deps: ['Default', 'Core', 'Physics'],
		components: {
			// Mixins
			MeshMixin: []
		},
		resources: {
			viewport,
			sceneObjects: new Map(),
			previewConfig: { ...renderConfig.preview.initial },
			previewState: {
				savedCameraSnapshot: null,
				lastFollowDirection: null,
				targetEntityId: null
			}
		},
		appExtensions: {
			setRenderContainer(this: TRenderApp, container: HTMLDivElement | null): void {
				this.r.viewport.setContainer(container);
			},
			setPreviewEnabled(this: TRenderApp, enabled: boolean): void {
				if (this.r.previewConfig.enabled === enabled) {
					return;
				}

				this.updateResource('previewConfig', {
					...this.r.previewConfig,
					enabled
				});
				this.updateResource(
					'previewState',
					enabled
						? enterPreview(this.r.viewport, this.r.previewState)
						: exitPreview(this.r.viewport, this.r.previewState)
				);
			},
			togglePreview(this: TRenderApp): void {
				this.setPreviewEnabled(!this.r.previewConfig.enabled);
			},
			updatePreviewConfig(
				this: TRenderApp,
				patch: Partial<TRenderApp['r']['previewConfig']>
			): void {
				this.updateResource('previewConfig', {
					...this.r.previewConfig,
					...patch
				});
			},
			setPreviewTargetEntity(this: TRenderApp, entityId: number | null): void {
				if (this.r.previewState.targetEntityId === entityId) {
					return;
				}

				this.updateResource('previewState', {
					...this.r.previewState,
					targetEntityId: entityId
				});
			},
			disposeRender(this: TRenderApp): void {
				this.r.sceneObjects.clear();
				this.r.viewport.dispose();
			}
		},
		setup(app: TRenderApp) {
			app.addSystem(mountThreeObjectsSystem, { set: 'PostUpdate' });
			app.addSystem(syncThreeObjectTransformsSystem, {
				set: 'PostUpdate',
				after: mountThreeObjectsSystem
			});
			app.addSystem(cleanupOrphanedThreeObjectsSystem, {
				set: 'Last',
				after: syncThreeObjectTransformsSystem
			});
			app.addSystem(syncPreviewCameraSystem, {
				set: 'Last',
				after: cleanupOrphanedThreeObjectsSystem
			});
			app.addSystem(renderFrameSystem, { set: 'Last', after: syncPreviewCameraSystem });
		}
	};
}
