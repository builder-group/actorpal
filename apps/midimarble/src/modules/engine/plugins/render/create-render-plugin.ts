import { Entity, type TApp, type TAppContext, type TDefaultPlugin, type TPlugin } from 'ecsify';
import type * as THREE from 'three';
import type { TCorePlugin } from '../core/create-core-plugin';
import { RenderViewportRuntime } from './RenderViewportRuntime';

export function createRenderPlugin(): TRenderPlugin {
	const viewport = new RenderViewportRuntime();

	return {
		name: 'Render',
		deps: ['Default', 'Core'],
		components: {
			MeshRef: { value: [] }
		},
		resources: {
			viewport,
			cubeEid: null
		},
		setup(app: TRenderApp) {
			const cube = viewport.createCube();
			const cubeEid = app.createEntity();

			app.addComponent(cubeEid, app.c.Rotation, { x: 0, y: 0, z: 0 });
			app.addComponent(cubeEid, app.c.RotationSpeed, { x: 0.6, y: 1.1, z: 0.2 });
			app.addComponent(cubeEid, app.c.MeshRef, { value: cube });
			app.r.cubeEid = cubeEid;

			app.addSystem(syncMeshTransformsSystem, { set: 'Update' });
			app.addSystem(renderFrameSystem, { set: 'Last', after: syncMeshTransformsSystem });
		}
	};
}

export type TRenderPlugin = TPlugin<
	{
		name: 'Render';
		components: {
			MeshRef: TCMeshRef;
		};
		resources: {
			viewport: RenderViewportRuntime;
			cubeEid: number | null;
		};
		systemSets: 'First' | 'Update' | 'Last';
	},
	[TDefaultPlugin, TCorePlugin]
>;

type TCMeshRef = { value: (THREE.Object3D | null)[] };
type TRenderApp = TApp<TAppContext<[TDefaultPlugin, TCorePlugin, TRenderPlugin]>>;

// MARK: - Systems

function syncMeshTransformsSystem(app: TRenderApp) {
	for (const [, rotation, meshRef] of app.queryComponents([
		Entity,
		app.c.Rotation,
		app.c.MeshRef
	] as const)) {
		const mesh = meshRef.value;
		if (mesh == null) continue;

		mesh.rotation.set(rotation.x, rotation.y, rotation.z);
	}
}

function renderFrameSystem(app: TRenderApp) {
	app.r.viewport.renderFrame();
}
