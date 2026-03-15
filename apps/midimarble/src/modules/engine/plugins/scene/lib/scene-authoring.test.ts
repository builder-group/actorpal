import { describe, expect, it, vi } from 'vitest';
import { updateMarblePhysicsAuthoring, updateNotePlatformAuthoring } from './scene-authoring';

describe('scene authoring helpers', () => {
	it('updates note platforms only when authored values actually change', () => {
		const updateComponent = vi.fn();
		const components = {
			NotePlatformMixin: Symbol('NotePlatformMixin')
		};
		const app = {
			c: components,
			queryComponents: vi.fn(() => [
				[
					17,
					{
						offsetY: 0,
						offsetZ: 0,
						rotationX: 0.2,
						length: 1.2,
						width: 0.84,
						thickness: 0.22,
						bounce: 0.58,
						color: '#2a5e92'
					}
				]
			]),
			updateComponent
		};
		const sceneApp = app as unknown as Parameters<typeof updateNotePlatformAuthoring>[0];

		expect(updateNotePlatformAuthoring(sceneApp, 17, { rotationX: 0.2 })).toBe(false);
		expect(updateComponent).not.toHaveBeenCalled();

		expect(updateNotePlatformAuthoring(sceneApp, 17, { bounce: 0.72 })).toBe(true);
		expect(updateComponent).toHaveBeenCalledWith(17, components.NotePlatformMixin, {
			offsetY: 0,
			offsetZ: 0,
			rotationX: 0.2,
			length: 1.2,
			width: 0.84,
			thickness: 0.22,
			bounce: 0.72,
			color: '#2a5e92'
		});
	});

	it('updates marble physics only when authored values actually change', () => {
		const updateComponent = vi.fn();
		const components = {
			MarbleTag: Symbol('MarbleTag'),
			MarblePhysicsMixin: Symbol('MarblePhysicsMixin')
		};
		const app = {
			c: components,
			queryComponents: vi.fn(() => [[3, { bounce: 0.32 }]]),
			updateComponent
		};
		const sceneApp = app as unknown as Parameters<typeof updateMarblePhysicsAuthoring>[0];

		expect(updateMarblePhysicsAuthoring(sceneApp, 3, { bounce: 0.32 })).toBe(false);
		expect(updateComponent).not.toHaveBeenCalled();

		expect(updateMarblePhysicsAuthoring(sceneApp, 3, { bounce: 0.61 })).toBe(true);
		expect(updateComponent).toHaveBeenCalledWith(3, components.MarblePhysicsMixin, {
			bounce: 0.61
		});
	});
});
