import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
	buildTrajectoryMarkerDescriptors,
	buildTrajectoryProjection,
	syncPlacedNoteMarkers
} from './note-markers';

const SONG = {
	bpm: 120,
	ticksPerBeat: 480
} as const;

describe('buildTrajectoryMarkerDescriptors', () => {
	it('builds past and buffered-future markers only', () => {
		const descriptors = buildTrajectoryMarkerDescriptors(
			SONG,
			{
				notes: [
					{ id: 1, tick: 0, durationTicks: 120, noteNumber: 60, velocity: 100, channel: 0 },
					{ id: 2, tick: 8, durationTicks: 120, noteNumber: 62, velocity: 100, channel: 0 },
					{ id: 3, tick: 20, durationTicks: 120, noteNumber: 64, velocity: 100, channel: 0 }
				]
			},
			2,
			1,
			4,
			1 / 240,
			new Map([
				[0, { x: 0, y: 0, z: 0 }],
				[1, { x: 1, y: 0, z: 0 }],
				[2, { x: 2, y: 0, z: 0 }]
			])
		);

		expect(descriptors).toEqual([
			{
				noteId: 1,
				tick: 0,
				step: 0,
				position: { x: 0, y: 0, z: 0 },
				phase: 'past',
				selected: false
			},
			{
				noteId: 2,
				tick: 8,
				step: 2,
				position: { x: 2, y: 0, z: 0 },
				phase: 'future',
				selected: true
			}
		]);
	});

	it('builds note anchor projection from the same marker descriptors', () => {
		const descriptors = buildTrajectoryMarkerDescriptors(
			SONG,
			{
				notes: [{ id: 4, tick: 12, durationTicks: 120, noteNumber: 65, velocity: 88, channel: 0 }]
			},
			null,
			1,
			4,
			1 / 240,
			new Map([[3, { x: 3, y: 2, z: 1 }]])
		);

		expect(buildTrajectoryProjection(descriptors)).toEqual(
			new Map([
				[
					4,
					{
						tick: 12,
						step: 3,
						position: { x: 3, y: 2, z: 1 },
						phase: 'future'
					}
				]
			])
		);
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
				[1, { tick: 0, step: 0, position: { x: 0, y: 0, z: 0 }, phase: 'past' as const }],
				[2, { tick: 8, step: 2, position: { x: 2, y: 0, z: 0 }, phase: 'future' as const }]
			]),
			2,
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
				[1, { tick: 0, step: 0, position: { x: 0, y: 0, z: 0 }, phase: 'past' as const }],
				[2, { tick: 8, step: 2, position: { x: 2, y: 0, z: 0 }, phase: 'future' as const }]
			]),
			null,
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
});
