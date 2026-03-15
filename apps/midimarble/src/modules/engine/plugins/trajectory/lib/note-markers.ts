import * as THREE from 'three';
import type { TVec3 } from '../../../types';
import { getTrackNotesInTickRange, tickToStep, type TMidiLookup, type TMidiSong } from '../../midi';
import { trajectoryConfig } from '../config';
import type {
	TTrajectoryNoteAnchor,
	TTrajectoryNoteMarkerState,
	TTrajectoryProjectedMarker
} from '../types';
import { getTrajectorySamplePosition, type TTrajectorySampleCache } from './trajectory-samples';

export interface TTrajectoryMarkerDescriptor {
	noteId: number;
	tick: number;
	step: number;
	position: TVec3;
}

export function buildTrajectoryProjection(
	descriptors: TTrajectoryMarkerDescriptor[]
): Map<number, TTrajectoryNoteAnchor> {
	const noteAnchorsById = new Map<number, TTrajectoryNoteAnchor>();
	for (const descriptor of descriptors) {
		noteAnchorsById.set(descriptor.noteId, {
			tick: descriptor.tick,
			step: descriptor.step,
			position: descriptor.position
		});
	}
	return noteAnchorsById;
}

export function buildProjectedMarkers(
	descriptors: TTrajectoryMarkerDescriptor[]
): TTrajectoryProjectedMarker[] {
	return descriptors.map(({ noteId, step }) => ({ noteId, step }));
}

export function buildTrajectoryMarkerDescriptors(
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'> | null,
	midiLookup: TMidiLookup,
	selectedTrackId: number | null,
	startTickExclusive: number,
	bufferedTick: number,
	fixedTimeStepSeconds: number,
	sampleCache: TTrajectorySampleCache
): TTrajectoryMarkerDescriptor[] {
	if (song == null || selectedTrackId == null) {
		return [];
	}

	const visibleNotes = getTrackNotesInTickRange(
		midiLookup,
		selectedTrackId,
		startTickExclusive,
		bufferedTick
	);
	const descriptors: TTrajectoryMarkerDescriptor[] = [];

	for (const note of visibleNotes) {
		const step = tickToStep(note.tick, song, fixedTimeStepSeconds);
		const position = getTrajectorySamplePosition(sampleCache, step);
		if (position == null) {
			continue;
		}

		descriptors.push({
			noteId: note.id,
			tick: note.tick,
			step,
			position
		});
	}

	return descriptors;
}

export function syncTrajectoryMarkers(
	group: THREE.Group,
	noteIdToMarker: Map<number, THREE.Object3D>,
	markerToNoteId: Map<THREE.Object3D, number>,
	material: THREE.Material,
	geometry: THREE.BufferGeometry,
	descriptors: TTrajectoryMarkerDescriptor[],
	removeMissing: boolean = true
): void {
	if (removeMissing) {
		const nextNoteIds = new Set(descriptors.map((descriptor) => descriptor.noteId));

		for (const [noteId, marker] of noteIdToMarker) {
			if (nextNoteIds.has(noteId)) {
				continue;
			}

			group.remove(marker);
			noteIdToMarker.delete(noteId);
			markerToNoteId.delete(marker);
		}
	}

	for (const descriptor of descriptors) {
		const existing = noteIdToMarker.get(descriptor.noteId);
		const marker = existing instanceof THREE.Mesh ? existing : new THREE.Mesh(geometry, material);
		marker.material = material;
		marker.position.set(descriptor.position.x, descriptor.position.y, descriptor.position.z);
		marker.scale.setScalar(trajectoryConfig.marker.scale);
		if (existing == null) {
			group.add(marker);
			noteIdToMarker.set(descriptor.noteId, marker);
			markerToNoteId.set(marker, descriptor.noteId);
		}
	}
}

export function syncPlacedNoteMarkers(
	noteIdToMarker: Map<number, THREE.Object3D>,
	noteAnchorsById: Map<number, TTrajectoryNoteAnchor>,
	selectedNoteIds: ReadonlySet<number>,
	liveStep: number,
	noteState: TTrajectoryNoteMarkerState,
	materials: TTrajectoryMarkerMaterials
): void {
	for (const [noteId, marker] of noteIdToMarker) {
		const anchor = noteAnchorsById.get(noteId);
		if (!(marker instanceof THREE.Mesh) || anchor == null) {
			continue;
		}

		applyMarkerStyle(marker, noteId, anchor.step, selectedNoteIds, liveStep, noteState, materials);
	}
}

export function syncTrajectoryMarkerDescriptorStyles(
	noteIdToMarker: Map<number, THREE.Object3D>,
	descriptors: readonly TTrajectoryMarkerDescriptor[],
	selectedNoteIds: ReadonlySet<number>,
	liveStep: number,
	noteState: TTrajectoryNoteMarkerState,
	materials: TTrajectoryMarkerMaterials
): void {
	for (const descriptor of descriptors) {
		const marker = noteIdToMarker.get(descriptor.noteId);
		if (!(marker instanceof THREE.Mesh)) {
			continue;
		}

		applyMarkerStyle(
			marker,
			descriptor.noteId,
			descriptor.step,
			selectedNoteIds,
			liveStep,
			noteState,
			materials
		);
	}
}

export function syncNoteMarkerPhase(
	noteIdToMarker: Map<number, THREE.Object3D>,
	noteAnchorsById: Map<number, TTrajectoryNoteAnchor>,
	projectedMarkers: readonly TTrajectoryProjectedMarker[],
	previousLiveStep: number,
	nextLiveStep: number,
	selectedNoteIds: ReadonlySet<number>,
	noteState: TTrajectoryNoteMarkerState,
	materials: TTrajectoryMarkerMaterials
): void {
	if (previousLiveStep === nextLiveStep || projectedMarkers.length === 0) {
		return;
	}

	const startStep = Math.min(previousLiveStep, nextLiveStep);
	const endStep = Math.max(previousLiveStep, nextLiveStep);
	const startIndex = upperBoundProjectedMarkerStep(projectedMarkers, startStep);
	const endIndex = upperBoundProjectedMarkerStep(projectedMarkers, endStep);

	for (let index = startIndex; index < endIndex; index += 1) {
		const projectedMarker = projectedMarkers[index];
		if (projectedMarker == null) {
			continue;
		}

		const marker = noteIdToMarker.get(projectedMarker.noteId);
		const anchor = noteAnchorsById.get(projectedMarker.noteId);
		if (!(marker instanceof THREE.Mesh) || anchor == null) {
			continue;
		}

		applyMarkerStyle(
			marker,
			projectedMarker.noteId,
			anchor.step,
			selectedNoteIds,
			nextLiveStep,
			noteState,
			materials
		);
	}
}

interface TTrajectoryMarkerMaterials {
	past: THREE.Material;
	pastPlaced: THREE.Material;
	pastAdjusted: THREE.Material;
	future: THREE.Material;
	futurePlaced: THREE.Material;
	futureAdjusted: THREE.Material;
	selected: THREE.Material;
}

function applyMarkerStyle(
	marker: THREE.Mesh,
	noteId: number,
	step: number,
	selectedNoteIds: ReadonlySet<number>,
	liveStep: number,
	noteState: TTrajectoryNoteMarkerState,
	materials: TTrajectoryMarkerMaterials
): void {
	marker.material = resolveMarkerMaterial(
		noteId,
		step,
		selectedNoteIds,
		liveStep,
		noteState,
		materials
	);
	marker.scale.setScalar(
		selectedNoteIds.has(noteId)
			? trajectoryConfig.marker.selectedScale
			: trajectoryConfig.marker.scale
	);
}

function resolveMarkerMaterial(
	noteId: number,
	step: number,
	selectedNoteIds: ReadonlySet<number>,
	liveStep: number,
	noteState: TTrajectoryNoteMarkerState,
	materials: TTrajectoryMarkerMaterials
): THREE.Material {
	if (selectedNoteIds.has(noteId)) {
		return materials.selected;
	}

	const isAdjusted = noteState.adjustedNoteIds.has(noteId);
	const isPlaced = noteState.placedNoteIds.has(noteId);
	if (step <= liveStep) {
		return isAdjusted ? materials.pastAdjusted : isPlaced ? materials.pastPlaced : materials.past;
	}

	return isAdjusted
		? materials.futureAdjusted
		: isPlaced
			? materials.futurePlaced
			: materials.future;
}

function upperBoundProjectedMarkerStep(
	projectedMarkers: readonly TTrajectoryProjectedMarker[],
	step: number
): number {
	let low = 0;
	let high = projectedMarkers.length;

	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		if ((projectedMarkers[mid]?.step ?? 0) <= step) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}

	return low;
}
