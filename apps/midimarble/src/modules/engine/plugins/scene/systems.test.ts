import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createNotePlatformColliders, createNotePlatformObject } from './bundles/note-platform';
import { sceneConfig } from './config';
import {
	syncNotePlatformRuntimeSystem,
	syncOrphanedNotePlatformsSystem,
	syncPreviewInteractionSystem,
	syncSceneManipulationHandlesSystem
} from './systems';

describe('syncNotePlatformRuntimeSystem', () => {
	it('requests a follow-up simulation sync when note anchors move a bound platform', () => {
		const updateComponent = vi.fn();
		const markSimulationDirty = vi.fn();
		const requestSimulationSync = vi.fn();
		const notePlatformMesh = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshBasicMaterial()
		);
		const app = {
			c: {
				NotePlatformMixin: Symbol('NotePlatformMixin'),
				NoteBindingMixin: Symbol('NoteBindingMixin'),
				PositionMixin: Symbol('PositionMixin'),
				RotationMixin: Symbol('RotationMixin'),
				MeshMixin: Symbol('MeshMixin'),
				ColliderMixin: Symbol('ColliderMixin')
			},
			r: {
				simulationSync: { mode: 'idle' },
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
			wasResourceChanged: vi.fn((resource: string) => resource === 'trajectoryProjection'),
			queryEntities: vi.fn(() => []),
			queryComponents: vi.fn(() => [
				[
					12,
					{ noteId: 7 },
					{
						offsetY: 0.25,
						offsetZ: -0.5,
						rotationX: 0,
						length: 1.2,
						width: 0.84,
						thickness: 0.22,
						bounce: 0.58,
						color: '#2a5e92'
					},
					{ x: 0, y: 0, z: 0 },
					{ x: 0, y: 0, z: 0 },
					{ type: 'three', object: notePlatformMesh },
					{
						descriptors: [
							{
								shape: 'cuboid',
								halfExtents: { x: 0.4, y: 0.11, z: 0.6 }
							}
						]
					}
				]
			]),
			updateComponent,
			markSimulationDirty,
			requestSimulationSync
		};

		syncNotePlatformRuntimeSystem(app as never);

		expect(updateComponent).toHaveBeenCalledWith(
			12,
			app.c.PositionMixin,
			expect.objectContaining({
				x: 1 - (sceneConfig.track.defaultWidth - 0.84) / 2,
				y: 2 - (0.36 + 0.11) + 0.25,
				z: 2.5
			})
		);
		expect(markSimulationDirty).toHaveBeenCalledOnce();
		expect(requestSimulationSync).toHaveBeenCalledOnce();
	});

	it('does not touch note-platform runtime while simulation sync is rebuilding', () => {
		const app = {
			r: {
				simulationSync: { mode: 'rebuilding' }
			},
			wasResourceChanged: vi.fn(),
			queryEntities: vi.fn(),
			queryComponents: vi.fn(),
			updateComponent: vi.fn(),
			markSimulationDirty: vi.fn(),
			requestSimulationSync: vi.fn()
		};

		syncNotePlatformRuntimeSystem(app as never);

		expect(app.wasResourceChanged).not.toHaveBeenCalled();
		expect(app.updateComponent).not.toHaveBeenCalled();
		expect(app.markSimulationDirty).not.toHaveBeenCalled();
		expect(app.requestSimulationSync).not.toHaveBeenCalled();
	});

	it('keeps note-platform geometry and colliders intact for transform-only edits', () => {
		const updateComponent = vi.fn();
		const platform = {
			offsetY: 0.25,
			offsetZ: -0.5,
			rotationX: 0.1,
			length: 1.2,
			width: 0.84,
			thickness: 0.22,
			bounce: 0.58,
			color: '#2a5e92'
		};
		const notePlatformMesh = createNotePlatformObject(platform) as THREE.Mesh;
		const originalGeometry = notePlatformMesh.geometry;
		const app = {
			c: {
				NotePlatformMixin: Symbol('NotePlatformMixin'),
				NoteBindingMixin: Symbol('NoteBindingMixin'),
				PositionMixin: Symbol('PositionMixin'),
				RotationMixin: Symbol('RotationMixin'),
				MeshMixin: Symbol('MeshMixin'),
				ColliderMixin: Symbol('ColliderMixin')
			},
			r: {
				simulationSync: { mode: 'idle' },
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
			wasResourceChanged: vi.fn(() => false),
			queryEntities: vi.fn(() => [12]),
			queryComponents: vi.fn(() => [
				[
					12,
					{ noteId: 7 },
					platform,
					{ x: 0, y: 0, z: 0 },
					{ x: 0, y: 0, z: 0 },
					{ type: 'three', object: notePlatformMesh },
					{
						descriptors: createNotePlatformColliders(platform)
					}
				]
			]),
			updateComponent,
			markSimulationDirty: vi.fn(),
			requestSimulationSync: vi.fn()
		};

		syncNotePlatformRuntimeSystem(app as never);

		expect(notePlatformMesh.geometry).toBe(originalGeometry);
		expect(updateComponent).not.toHaveBeenCalledWith(12, app.c.ColliderMixin, expect.anything());
	});

	it('removes orphaned note platforms when the bound note disappears from midi state', () => {
		const destroyEntity = vi.fn();
		const markSimulationDirty = vi.fn();
		const requestSimulationSync = vi.fn();
		const updateResource = vi.fn();

		syncOrphanedNotePlatformsSystem({
			c: {
				NoteBindingMixin: Symbol('NoteBindingMixin'),
				NotePlatformMixin: Symbol('NotePlatformMixin')
			},
			r: {
				midiSong: {
					name: 'Demo',
					bpm: 120,
					ticksPerBeat: 480,
					totalTicks: 960,
					tracks: [
						{
							id: 0,
							name: 'Lead',
							notes: [
								{ id: 3, tick: 0, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 }
							]
						}
					]
				},
				sceneSelection: { entityId: 12 },
				sceneManipulationState: {
					mode: 'move',
					entityId: 12,
					isDragging: false,
					didEdit: false,
					pointerDownClient: null,
					dragPlaneX: null,
					dragOffset: null
				},
				viewport: {
					setControlsEnabled: vi.fn()
				}
			},
			wasResourceChanged: vi.fn((resource: string) => resource === 'midiSong'),
			queryComponents: vi.fn(() => [[12, { noteId: 7 }]]),
			updateResource,
			destroyEntity,
			markSimulationDirty,
			requestSimulationSync
		} as never);

		expect(destroyEntity).toHaveBeenCalledWith(12);
		expect(markSimulationDirty).toHaveBeenCalledOnce();
		expect(requestSimulationSync).toHaveBeenCalledOnce();
		expect(updateResource).toHaveBeenCalledWith('sceneSelection', { entityId: null });
	});

	it('hides manipulation handles while preview mode is active', () => {
		const handles = {
			start: { visible: true, position: new THREE.Vector3() },
			end: { visible: true, position: new THREE.Vector3() }
		};

		syncSceneManipulationHandlesSystem({
			r: {
				previewConfig: { enabled: true },
				sceneSelection: { entityId: 12 },
				sceneManipulationHandles: handles
			}
		} as never);

		expect(handles.start.visible).toBe(false);
		expect(handles.end.visible).toBe(false);
	});

	it('commits pending scene edits before clearing manipulation state for preview', () => {
		const markSimulationDirty = vi.fn();
		const requestSimulationSync = vi.fn();
		const setSceneEditPending = vi.fn();
		const updateResource = vi.fn();

		syncPreviewInteractionSystem({
			r: {
				previewConfig: { enabled: true },
				sceneManipulationState: {
					mode: 'resizeEnd',
					entityId: 12,
					pointerDownClient: { x: 10, y: 20 },
					dragPlaneX: 0,
					dragOffset: { x: 0, y: 0, z: 0 },
					isDragging: true,
					didEdit: true
				}
			},
			wasResourceChanged: vi.fn((resource: string) => resource === 'previewConfig'),
			markSimulationDirty,
			requestSimulationSync,
			setSceneEditPending,
			updateResource
		} as never);

		expect(markSimulationDirty).toHaveBeenCalledOnce();
		expect(requestSimulationSync).toHaveBeenCalledOnce();
		expect(setSceneEditPending).toHaveBeenCalledWith(false);
		expect(updateResource).toHaveBeenCalledTimes(1);
	});
});
