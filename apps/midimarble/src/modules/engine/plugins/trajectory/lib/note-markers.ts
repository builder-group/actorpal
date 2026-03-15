import * as THREE from 'three';
import type { TVec3 } from '../../../types';
import { findTrackById, tickToStep, type TMidiNote, type TMidiSong } from '../../midi';
import type { TTrajectoryNoteAnchor } from '../types';

export const MARKER_SCALE = 0.22;
export const SELECTED_MARKER_SCALE = 0.3;

export interface TTrajectoryMarkerDescriptor {
	noteId: number;
	tick: number;
	step: number;
	position: TVec3;
	phase: 'past' | 'future';
	selected: boolean;
}

export function buildTrajectoryProjection(
	descriptors: TTrajectoryMarkerDescriptor[]
): Map<number, TTrajectoryNoteAnchor> {
	const noteAnchorsById = new Map<number, TTrajectoryNoteAnchor>();
	for (const descriptor of descriptors) {
		noteAnchorsById.set(descriptor.noteId, {
			tick: descriptor.tick,
			step: descriptor.step,
			position: descriptor.position,
			phase: descriptor.phase
		});
	}
	return noteAnchorsById;
}

export function buildTrajectoryMarkerDescriptors(
	song: Pick<TMidiSong, 'bpm' | 'ticksPerBeat'> | null,
	track: { notes: TMidiNote[] } | null,
	selectedNoteIds: ReadonlySet<number>,
	liveStep: number,
	bufferedStep: number,
	fixedTimeStepSeconds: number,
	positionsByStep: Map<number, TVec3>
): TTrajectoryMarkerDescriptor[] {
	if (song == null || track == null) {
		return [];
	}

	const descriptors: TTrajectoryMarkerDescriptor[] = [];
	for (const note of track.notes) {
		const step = tickToStep(note.tick, song, fixedTimeStepSeconds);
		if (step > bufferedStep) {
			continue;
		}

		const position = positionsByStep.get(step);
		if (position == null) {
			continue;
		}

		descriptors.push({
			noteId: note.id,
			tick: note.tick,
			step,
			position,
			phase: step <= liveStep ? 'past' : 'future',
			selected: selectedNoteIds.has(note.id)
		});
	}

	return descriptors;
}

export function syncTrajectoryMarkers(
	group: THREE.Group,
	noteIdToMarker: Map<number, THREE.Object3D>,
	markerToNoteId: Map<THREE.Object3D, number>,
	materials: {
		past: THREE.Material;
		future: THREE.Material;
		selected: THREE.Material;
	},
	geometry: THREE.BufferGeometry,
	descriptors: TTrajectoryMarkerDescriptor[]
): void {
	for (const marker of noteIdToMarker.values()) {
		group.remove(marker);
	}

	noteIdToMarker.clear();
	markerToNoteId.clear();

	for (const descriptor of descriptors) {
		const material = descriptor.selected
			? materials.selected
			: descriptor.phase === 'past'
				? materials.past
				: materials.future;
		const marker = new THREE.Mesh(geometry, material);
		marker.position.set(descriptor.position.x, descriptor.position.y, descriptor.position.z);
		const scale = descriptor.selected ? SELECTED_MARKER_SCALE : MARKER_SCALE;
		marker.scale.setScalar(scale);
		group.add(marker);
		noteIdToMarker.set(descriptor.noteId, marker);
		markerToNoteId.set(marker, descriptor.noteId);
	}
}

export function syncPlacedNoteMarkers(
	noteIdToMarker: Map<number, THREE.Object3D>,
	noteAnchorsById: Map<number, TTrajectoryNoteAnchor>,
	selectedNoteIds: ReadonlySet<number>,
	noteState: {
		placedNoteIds: Set<number>;
		adjustedNoteIds: Set<number>;
	},
	materials: {
		past: THREE.Material;
		pastPlaced: THREE.Material;
		pastAdjusted: THREE.Material;
		future: THREE.Material;
		futurePlaced: THREE.Material;
		futureAdjusted: THREE.Material;
		selected: THREE.Material;
	}
): void {
	for (const [noteId, marker] of noteIdToMarker) {
		const anchor = noteAnchorsById.get(noteId);
		if (!(marker instanceof THREE.Mesh) || anchor == null) {
			continue;
		}

		const isSelected = selectedNoteIds.has(noteId);
		const isAdjusted = noteState.adjustedNoteIds.has(noteId);
		const isPlaced = noteState.placedNoteIds.has(noteId);
		if (isSelected) {
			marker.material = materials.selected;
		} else if (anchor.phase === 'past') {
			marker.material = isAdjusted
				? materials.pastAdjusted
				: isPlaced
					? materials.pastPlaced
					: materials.past;
		} else {
			marker.material = isAdjusted
				? materials.futureAdjusted
				: isPlaced
					? materials.futurePlaced
					: materials.future;
		}
		marker.scale.setScalar(isSelected ? SELECTED_MARKER_SCALE : MARKER_SCALE);
	}
}

export function findSelectedTrack(
	song: TMidiSong | null,
	selectedTrackId: number | null
): { notes: TMidiNote[] } | null {
	return findTrackById(song, selectedTrackId);
}
