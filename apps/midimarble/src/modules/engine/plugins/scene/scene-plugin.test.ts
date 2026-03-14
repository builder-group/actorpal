import { describe, expect, it, vi } from 'vitest';
import { createScenePlugin } from './scene-plugin';

describe('scene authoring commands', () => {
	it('creates a straight track near the live marble and selects it', () => {
		const plugin = createScenePlugin();
		const createStraightTrack = plugin.appExtensions?.createStraightTrack;
		expect(createStraightTrack).toBeTypeOf('function');
		const app = createMockSceneApp({
			r: {
				...baseResources(),
				rigidBodies: new Map([
					[
						3,
						{
							translation: () => ({ x: -7.25, y: 21, z: -4 })
						}
					]
				])
			},
			queryComponents: vi.fn((components: unknown[]) =>
				components[1] === componentKeys.PositionMixin
					? ([[3, { x: -7.25, y: 18.4, z: -25.2 }]] as never)
					: ([] as never)
			),
			spawnBundle: vi.fn((bundle) => {
				const position = bundle.find(
					(item: { component: symbol }) => item.component === componentKeys.PositionMixin
				)?.value;
				const rotation = bundle.find(
					(item: { component: symbol }) => item.component === componentKeys.RotationMixin
				)?.value;
				expect(position).toEqual({ x: -7.25, y: 18, z: 4 });
				expect(rotation).toEqual({ x: 0, y: 0, z: 0 });
				return 61;
			})
		});

		const entityId = createStraightTrack?.call(app as never);

		expect(entityId).toBe(61);
		expect(app.spawnBundle).toHaveBeenCalledOnce();
		expect(app.selectNote).toHaveBeenCalledWith(null);
		expect(app.updateResource).toHaveBeenCalledWith('sceneSelection', { entityId: 61 });
		expect(app.markSimulationDirty).toHaveBeenCalledOnce();
		expect(app.requestSimulationSync).toHaveBeenCalledOnce();
	});

	it('deletes only straight tracks and clears selection state', () => {
		const plugin = createScenePlugin();
		const deleteStraightTrack = plugin.appExtensions?.deleteStraightTrack;
		expect(deleteStraightTrack).toBeTypeOf('function');
		const app = createMockSceneApp({
			hasComponent: vi.fn(
				(eid: number, component: symbol) =>
					eid === 51 && component === componentKeys.StraightTrackMixin
			),
			r: {
				...baseResources(),
				sceneSelection: { entityId: 51 },
				sceneManipulationState: {
					mode: 'move',
					entityId: 51,
					isDragging: false,
					didEdit: false,
					pointerDownClient: null,
					dragPlaneX: null,
					dragOffset: null
				}
			}
		});

		const deleted = deleteStraightTrack?.call(app as never, 51);

		expect(deleted).toBe(true);
		expect(app.destroyEntity).toHaveBeenCalledWith(51);
		expect(app.updateResource).toHaveBeenNthCalledWith(1, 'sceneSelection', { entityId: null });
		expect(app.updateResource).toHaveBeenNthCalledWith(
			2,
			'sceneManipulationState',
			expect.objectContaining({ mode: 'idle', entityId: null })
		);
		expect(app.markSimulationDirty).toHaveBeenCalledOnce();
		expect(app.requestSimulationSync).toHaveBeenCalledOnce();
	});

	it('does not delete non-straight scene entities', () => {
		const plugin = createScenePlugin();
		const deleteStraightTrack = plugin.appExtensions?.deleteStraightTrack;
		expect(deleteStraightTrack).toBeTypeOf('function');
		const app = createMockSceneApp({
			hasComponent: vi.fn(() => false)
		});

		const deleted = deleteStraightTrack?.call(app as never, 9);

		expect(deleted).toBe(false);
		expect(app.destroyEntity).not.toHaveBeenCalled();
		expect(app.updateResource).not.toHaveBeenCalled();
		expect(app.markSimulationDirty).not.toHaveBeenCalled();
		expect(app.requestSimulationSync).not.toHaveBeenCalled();
	});

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
	AuthoredTransformMixin: Symbol('AuthoredTransformMixin'),
	LinearElementMixin: Symbol('LinearElementMixin'),
	MarbleTag: Symbol('MarbleTag'),
	StraightTrackMixin: Symbol('StraightTrackMixin'),
	NoteBindingMixin: Symbol('NoteBindingMixin'),
	NotePlatformMixin: Symbol('NotePlatformMixin'),
	MeshMixin: Symbol('MeshMixin'),
	RigidBodyMixin: Symbol('RigidBodyMixin'),
	ColliderMixin: Symbol('ColliderMixin')
};

function baseResources() {
	return {
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
		},
		sceneSelection: {
			entityId: null
		},
		sceneManipulationState: {
			mode: 'idle',
			entityId: null,
			isDragging: false,
			didEdit: false,
			pointerDownClient: null,
			dragPlaneX: null,
			dragOffset: null
		},
		viewport: {
			setControlsEnabled: vi.fn()
		},
		rigidBodies: new Map()
	};
}

function createMockSceneApp(
	overrides: Partial<{
		queryComponents: ReturnType<typeof vi.fn>;
		spawnBundle: ReturnType<typeof vi.fn>;
		hasComponent: ReturnType<typeof vi.fn>;
		destroyEntity: ReturnType<typeof vi.fn>;
		r: Record<string, unknown>;
	}> = {}
) {
	return {
		c: componentKeys,
		r: overrides.r ?? baseResources(),
		selectNote: vi.fn(),
		updateResource: vi.fn(),
		markSimulationDirty: vi.fn(),
		requestSimulationSync: vi.fn(),
		destroyEntity: overrides.destroyEntity ?? vi.fn(),
		hasComponent: overrides.hasComponent ?? vi.fn(() => false),
		queryComponents: overrides.queryComponents ?? vi.fn(() => [] as never),
		spawnBundle: overrides.spawnBundle ?? vi.fn(() => 51)
	};
}
