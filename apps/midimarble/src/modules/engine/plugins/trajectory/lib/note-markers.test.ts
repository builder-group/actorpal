import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildMidiLookup } from '../../midi';
import {
	buildProjectedMarkers,
	buildTrajectoryMarkerDescriptors,
	buildTrajectoryProjection,
	syncNoteMarkerPhase,
	syncPlacedNoteMarkers
} from './note-markers';

const SONG = {
	bpm: 120,
	ticksPerBeat: 480
} as const;

describe('buildTrajectoryMarkerDescriptors', () => {
	it('builds past and buffered-future markers only', () => {
		const midiLookup = buildMidiLookup({
			name: 'test',
			bpm: 120,
			ticksPerBeat: 480,
			totalTicks: 20,
			tracks: [
				{
					id: 1,
					name: 'Track 1',
					notes: [
						{ id: 1, tick: 0, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 },
						{ id: 2, tick: 8, durationTicks: 120, noteNumber: 62, velocity: 100, channel: 0 },
						{ id: 3, tick: 20, durationTicks: 120, noteNumber: 64, velocity: 100, channel: 0 }
					]
				}
			]
		});
		const descriptors = buildTrajectoryMarkerDescriptors(
			SONG,
			midiLookup,
			1,
			-1,
			16,
			1 / 240,
			{
				points: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]),
				endStep: 2
			}
		);

		expect(descriptors).toEqual([
			{
				noteId: 1,
				tick: 0,
				step: 0,
				position: { x: 0, y: 0, z: 0 }
			},
			{
				noteId: 2,
				tick: 8,
				step: 2,
				position: { x: 2, y: 0, z: 0 }
			}
		]);
	});

	it('builds note anchor projection from the same marker descriptors', () => {
		const midiLookup = buildMidiLookup({
			name: 'test',
			bpm: 120,
			ticksPerBeat: 480,
			totalTicks: 12,
			tracks: [
				{
					id: 4,
					name: 'Track 4',
					notes: [{ id: 4, tick: 12, durationTicks: 120, noteNumber: 65, velocity: 88, channel: 0 }]
				}
			]
		});
		const descriptors = buildTrajectoryMarkerDescriptors(
			SONG,
			midiLookup,
			4,
			-1,
			16,
			1 / 240,
			{
				points: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 2, 1]),
				endStep: 3
			}
		);

		expect(buildTrajectoryProjection(descriptors)).toEqual(
			new Map([
				[
					4,
					{
						tick: 12,
						step: 3,
						position: { x: 3, y: 2, z: 1 }
					}
				]
			])
		);
	});

	it('updates only markers that cross the live step boundary', () => {
		const past = new THREE.MeshBasicMaterial();
		const pastPlaced = new THREE.MeshBasicMaterial();
		const pastAdjusted = new THREE.MeshBasicMaterial();
		const future = new THREE.MeshBasicMaterial();
		const futurePlaced = new THREE.MeshBasicMaterial();
		const futureAdjusted = new THREE.MeshBasicMaterial();
		const selected = new THREE.MeshBasicMaterial();
		const geometry = new THREE.SphereGeometry(1);
		const markerOne = new THREE.Mesh(geometry, past);
		const markerTwo = new THREE.Mesh(geometry, future);
		const noteIdToMarker = new Map<number, THREE.Object3D>([
			[1, markerOne],
			[2, markerTwo]
		]);
		const projectedMarkers = buildProjectedMarkers([
			{ noteId: 1, tick: 0, step: 0, position: { x: 0, y: 0, z: 0 } },
			{ noteId: 2, tick: 8, step: 2, position: { x: 2, y: 0, z: 0 } }
		]);

		syncNoteMarkerPhase(
			noteIdToMarker,
			new Map([
				[1, { tick: 0, step: 0, position: { x: 0, y: 0, z: 0 } }],
				[2, { tick: 8, step: 2, position: { x: 2, y: 0, z: 0 } }]
			]),
			projectedMarkers,
			1,
			2,
			new Set<number>(),
			{
				placedNoteIds: new Set(),
				adjustedNoteIds: new Set()
			},
			{
				past,
				pastPlaced,
				pastAdjusted,
				future,
				futurePlaced,
				futureAdjusted,
				selected
			}
		);

		expect(markerOne.material).toBe(past);
		expect(markerTwo.material).toBe(past);
	});

	it('styles placed markers without scene mutating trajectory internals directly', () => {
		const past = new THREE.MeshBasicMaterial();
		const pastPlaced = new THREE.MeshBasicMaterial();
		const pastAdjusted = new THREE.MeshBasicMaterial();
		const future = new THREE.MeshBasicMaterial();
		const futurePlaced = new THREE.MeshBasicMaterial();
		const futureAdjusted = new THREE.MeshBasicMaterial();
		const selected = new THREE.MeshBasicMaterial();
		const noteIdToMarker = new Map<number, THREE.Object3D>([
			[1, new THREE.Mesh(new THREE.SphereGeometry(1), past)],
			[2, new THREE.Mesh(new THREE.SphereGeometry(1), future)]
		]);

		syncPlacedNoteMarkers(
			noteIdToMarker,
			new Map([
				[1, { tick: 0, step: 0, position: { x: 0, y: 0, z: 0 } }],
				[2, { tick: 8, step: 2, position: { x: 2, y: 0, z: 0 } }]
			]),
			new Set([2]),
			1,
			{
				placedNoteIds: new Set([1]),
				adjustedNoteIds: new Set()
			},
			{
				past,
				pastPlaced,
				pastAdjusted,
				future,
				futurePlaced,
				futureAdjusted,
				selected
			}
		);

		expect((noteIdToMarker.get(1) as THREE.Mesh).material).toBe(pastPlaced);
		expect((noteIdToMarker.get(2) as THREE.Mesh).material).toBe(selected);
	});

	it('styles adjusted markers separately from merely placed ones', () => {
		const past = new THREE.MeshBasicMaterial();
		const pastPlaced = new THREE.MeshBasicMaterial();
		const pastAdjusted = new THREE.MeshBasicMaterial();
		const future = new THREE.MeshBasicMaterial();
		const futurePlaced = new THREE.MeshBasicMaterial();
		const futureAdjusted = new THREE.MeshBasicMaterial();
		const selected = new THREE.MeshBasicMaterial();
		const noteIdToMarker = new Map<number, THREE.Object3D>([
			[1, new THREE.Mesh(new THREE.SphereGeometry(1), past)],
			[2, new THREE.Mesh(new THREE.SphereGeometry(1), future)]
		]);

		syncPlacedNoteMarkers(
			noteIdToMarker,
			new Map([
				[1, { tick: 0, step: 0, position: { x: 0, y: 0, z: 0 } }],
				[2, { tick: 8, step: 2, position: { x: 2, y: 0, z: 0 } }]
			]),
			new Set<number>(),
			1,
			{
				placedNoteIds: new Set([1, 2]),
				adjustedNoteIds: new Set([2])
			},
			{
				past,
				pastPlaced,
				pastAdjusted,
				future,
				futurePlaced,
				futureAdjusted,
				selected
			}
		);

		expect((noteIdToMarker.get(1) as THREE.Mesh).material).toBe(pastPlaced);
		expect((noteIdToMarker.get(2) as THREE.Mesh).material).toBe(futureAdjusted);
	});

	it('styles every selected marker, not only the primary note', () => {
		const past = new THREE.MeshBasicMaterial();
		const pastPlaced = new THREE.MeshBasicMaterial();
		const pastAdjusted = new THREE.MeshBasicMaterial();
		const future = new THREE.MeshBasicMaterial();
		const futurePlaced = new THREE.MeshBasicMaterial();
		const futureAdjusted = new THREE.MeshBasicMaterial();
		const selected = new THREE.MeshBasicMaterial();
		const noteIdToMarker = new Map<number, THREE.Object3D>([
			[1, new THREE.Mesh(new THREE.SphereGeometry(1), past)],
			[2, new THREE.Mesh(new THREE.SphereGeometry(1), future)]
		]);

		syncPlacedNoteMarkers(
			noteIdToMarker,
			new Map([
				[1, { tick: 0, step: 0, position: { x: 0, y: 0, z: 0 } }],
				[2, { tick: 8, step: 2, position: { x: 2, y: 0, z: 0 } }]
			]),
			new Set([1, 2]),
			1,
			{
				placedNoteIds: new Set(),
				adjustedNoteIds: new Set()
			},
			{
				past,
				pastPlaced,
				pastAdjusted,
				future,
				futurePlaced,
				futureAdjusted,
				selected
			}
		);

		expect((noteIdToMarker.get(1) as THREE.Mesh).material).toBe(selected);
		expect((noteIdToMarker.get(2) as THREE.Mesh).material).toBe(selected);
	});
});
