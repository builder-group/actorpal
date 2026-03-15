import * as THREE from 'three';
import { findTrackById } from '../../midi';
import type { TTrajectoryApp } from '../types';

type TPointerTarget = {
	noteId: number;
	tick: number;
} | null;

export function setupTrajectoryMarkerInteraction(app: TTrajectoryApp): () => void {
	const raycaster = new THREE.Raycaster();
	const onPointerDown = (event: PointerEvent) => {
		const target = pickTrajectoryMarker(app, raycaster, event);
		if (target == null) {
			return;
		}

		event.preventDefault();
		event.stopImmediatePropagation();
		applyTrajectoryMarkerSelection(app, target.noteId, target.tick);
	};

	const canvas = app.r.viewport.domElement;
	canvas.addEventListener('pointerdown', onPointerDown);

	return () => {
		canvas.removeEventListener('pointerdown', onPointerDown);
	};
}

export function applyTrajectoryMarkerSelection(
	app: Pick<
		TTrajectoryApp,
		'pause' | 'seekToTick' | 'selectNote' | 'previewNote' | 'update' | 'updateResource'
	> & {
		r: Pick<TTrajectoryApp['r'], 'simulationSync'>;
	},
	noteId: number,
	tick: number
): void {
	if (app.r.simulationSync.mode !== 'idle') {
		app.updateResource('simulationSync', {
			...app.r.simulationSync,
			resumeWhenReady: false
		});
	}

	app.pause();
	app.seekToTick(tick);
	app.selectNote(noteId);
	app.update(0);
	void app.previewNote(noteId);
}

function pickTrajectoryMarker(
	app: TTrajectoryApp,
	raycaster: THREE.Raycaster,
	event: PointerEvent
): TPointerTarget {
	if (
		!app.r.isReady ||
		!app.r.trajectoryConfig.enabled ||
		app.r.previewConfig.enabled ||
		app.r.simulationSync.mode !== 'idle'
	) {
		return null;
	}

	const pointer = getNormalizedPointer(app, event);
	if (pointer == null) {
		return null;
	}

	const selectedTrack = findTrackById(app.r.midiSong, app.r.selectedTrackId);
	if (selectedTrack == null) {
		return null;
	}

	raycaster.setFromCamera(pointer, app.r.viewport.camera);
	const intersections = raycaster.intersectObjects(
		app.r.trajectoryState.noteMarkerGroup.children,
		true
	);
	for (const intersection of intersections) {
		let current: THREE.Object3D | null = intersection.object;
		while (current != null) {
			const noteId = app.r.trajectoryState.markerToNoteId.get(current);
			if (noteId != null) {
				const note = selectedTrack.notes.find((entry) => entry.id === noteId);
				return note == null ? null : { noteId, tick: note.tick };
			}
			current = current.parent;
		}
	}

	return null;
}

function getNormalizedPointer(app: TTrajectoryApp, event: PointerEvent): THREE.Vector2 | null {
	const rect = app.r.viewport.domElement.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) {
		return null;
	}

	return new THREE.Vector2(
		((event.clientX - rect.left) / rect.width) * 2 - 1,
		-((event.clientY - rect.top) / rect.height) * 2 + 1
	);
}
