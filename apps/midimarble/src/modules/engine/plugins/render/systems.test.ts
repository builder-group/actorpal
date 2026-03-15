import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { cleanupOrphanedThreeObjectsSystem } from './systems';

describe('cleanupOrphanedThreeObjectsSystem', () => {
	it('prunes mounted objects whose entity no longer has MeshMixin', () => {
		const object = new THREE.Group();
		const app = {
			c: {
				MeshMixin: Symbol('MeshMixin')
			},
			r: {
				sceneObjects: new Map([[14, object]]),
				viewport: {
					disposeObject: vi.fn()
				}
			},
			queryEntities: vi.fn(() => []),
			hasComponent: vi.fn(() => false)
		};

		cleanupOrphanedThreeObjectsSystem(app as never);

		expect(app.r.viewport.disposeObject).toHaveBeenCalledWith(object);
		expect(app.r.sceneObjects.has(14)).toBe(false);
	});
});
