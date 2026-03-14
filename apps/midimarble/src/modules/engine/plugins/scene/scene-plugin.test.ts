import { describe, expect, it, vi } from 'vitest';
import { createScenePlugin } from './scene-plugin';

describe('scene note platform creation', () => {
	it('creates a note platform once and selects the existing entity on repeat', () => {
		const plugin = createScenePlugin();
		const createOrSelectNotePlatform = plugin.appExtensions?.createOrSelectNotePlatform;
		expect(createOrSelectNotePlatform).toBeTypeOf('function');
		let nextEntityId = 51;
		const spawnedBindings = new Map<number, { noteId: number }>();
		const app = createMockSceneApp({
			spawnBundle: vi.fn((bundle) => {
				const entry = bundle.find(
					(item: { component: symbol }) => item.component === componentKeys.NoteBindingMixin
				);
				const entityId = nextEntityId++;
				spawnedBindings.set(entityId, entry?.value as { noteId: number });
				return entityId;
			}),
			queryComponents: vi.fn(
				() => Array.from(spawnedBindings.entries()).map(([eid, binding]) => [eid, binding]) as never
			)
		});

		const firstEntityId = createOrSelectNotePlatform?.call(app as never, 7);
		const secondEntityId = createOrSelectNotePlatform?.call(app as never, 7);

		expect(firstEntityId).toBe(51);
		expect(secondEntityId).toBe(51);
		expect(app.spawnBundle).toHaveBeenCalledTimes(1);
		expect(app.selectNote).toHaveBeenNthCalledWith(1, null);
		expect(app.selectNote).toHaveBeenNthCalledWith(2, null);
		expect(app.updateResource).toHaveBeenNthCalledWith(1, 'sceneSelection', { entityId: 51 });
		expect(app.updateResource).toHaveBeenNthCalledWith(2, 'sceneSelection', { entityId: 51 });
		expect(app.markSimulationDirty).toHaveBeenCalledOnce();
		expect(app.requestSimulationSync).toHaveBeenCalledOnce();
	});

	it('does not create a note platform when the note anchor is unresolved', () => {
		const plugin = createScenePlugin();
		const createOrSelectNotePlatform = plugin.appExtensions?.createOrSelectNotePlatform;
		expect(createOrSelectNotePlatform).toBeTypeOf('function');
		const app = createMockSceneApp();

		const entityId = createOrSelectNotePlatform?.call(app as never, 11);

		expect(entityId).toBeNull();
		expect(app.spawnBundle).not.toHaveBeenCalled();
		expect(app.updateResource).not.toHaveBeenCalled();
		expect(app.selectNote).not.toHaveBeenCalled();
		expect(app.markSimulationDirty).not.toHaveBeenCalled();
		expect(app.requestSimulationSync).not.toHaveBeenCalled();
	});
});

const componentKeys = {
	PositionMixin: Symbol('PositionMixin'),
	RotationMixin: Symbol('RotationMixin'),
	ScaleMixin: Symbol('ScaleMixin'),
	NoteBindingMixin: Symbol('NoteBindingMixin'),
	NotePlatformMixin: Symbol('NotePlatformMixin'),
	MeshMixin: Symbol('MeshMixin'),
	RigidBodyMixin: Symbol('RigidBodyMixin'),
	ColliderMixin: Symbol('ColliderMixin')
};

function createMockSceneApp(
	overrides: Partial<{
		queryComponents: ReturnType<typeof vi.fn>;
		spawnBundle: ReturnType<typeof vi.fn>;
	}> = {}
) {
	return {
		c: componentKeys,
		r: {
			trajectoryProjection: {
				noteAnchorsById: new Map([
					[
						7,
						{
							tick: 120,
							step: 30,
							position: { x: 1, y: 2, z: 3 },
							phase: 'future'
						}
					]
				])
			}
		},
		selectNote: vi.fn(),
		updateResource: vi.fn(),
		markSimulationDirty: vi.fn(),
		requestSimulationSync: vi.fn(),
		queryComponents: overrides.queryComponents ?? vi.fn(() => [] as never),
		spawnBundle: overrides.spawnBundle ?? vi.fn(() => 51)
	};
}
