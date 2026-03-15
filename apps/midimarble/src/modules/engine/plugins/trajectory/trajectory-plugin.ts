import * as THREE from 'three';
import { buildTrajectoryLine } from './lib/line-state';
import { setupTrajectoryMarkerInteraction } from './lib/marker-interaction';
import { syncPlacedNoteMarkers } from './lib/note-markers';
import { updateTrajectorySystem } from './systems';
import type { TTrajectoryApp, TTrajectoryNoteMarkerState, TTrajectoryPlugin } from './types';

export function createTrajectoryPlugin(): TTrajectoryPlugin {
	const futureColor = '#4a90e2';
	const pastColor = '#ff9943';
	const noteMarkerGroup = new THREE.Group();
	const markerGeometry = new THREE.SphereGeometry(1, 14, 14);
	const pastMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#ffb05b' });
	const pastPlacedMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#34d399' });
	const pastAdjustedMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#f59e0b' });
	const futureMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#68aef2' });
	const futurePlacedMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#6ee7b7' });
	const futureAdjustedMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#facc15' });
	const selectedMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
	let cleanupMarkerInteraction: (() => void) | null = null;

	return {
		// Trajectory is a separate authoring surface driven by physics state.
		name: 'Trajectory',
		deps: ['Default', 'Core', 'Midi', 'Transport', 'Audio', 'Physics', 'Render'],
		components: {
			TrajectorySourceTag: []
		},
		resources: {
			trajectoryConfig: {
				enabled: true,
				futureColor,
				pastColor
			},
			trajectoryState: {
				futureLine: buildTrajectoryLine(futureColor),
				pastLine: buildTrajectoryLine(pastColor),
				noteMarkerGroup,
				noteIdToMarker: new Map(),
				markerToNoteId: new Map(),
				markerGeometry,
				pastMarkerMaterial,
				pastPlacedMarkerMaterial,
				pastAdjustedMarkerMaterial,
				futureMarkerMaterial,
				futurePlacedMarkerMaterial,
				futureAdjustedMarkerMaterial,
				selectedMarkerMaterial
			},
			trajectoryProjection: {
				noteAnchorsById: new Map()
			}
		},
		appExtensions: {
			disposeTrajectory(this: TTrajectoryApp): void {
				cleanupMarkerInteraction?.();
				cleanupMarkerInteraction = null;
				const state = this.r.trajectoryState;
				state.markerGeometry.dispose();
				state.pastMarkerMaterial.dispose();
				state.pastPlacedMarkerMaterial.dispose();
				state.pastAdjustedMarkerMaterial.dispose();
				state.futureMarkerMaterial.dispose();
				state.futurePlacedMarkerMaterial.dispose();
				state.futureAdjustedMarkerMaterial.dispose();
				state.selectedMarkerMaterial.dispose();
			},
			syncNoteMarkers(this: TTrajectoryApp, noteState: TTrajectoryNoteMarkerState): void {
				const state = this.r.trajectoryState;
				syncPlacedNoteMarkers(
					state.noteIdToMarker,
					this.r.trajectoryProjection.noteAnchorsById,
					this.r.selectedNoteIds,
					noteState,
					{
						past: state.pastMarkerMaterial,
						pastPlaced: state.pastPlacedMarkerMaterial,
						pastAdjusted: state.pastAdjustedMarkerMaterial,
						future: state.futureMarkerMaterial,
						futurePlaced: state.futurePlacedMarkerMaterial,
						futureAdjusted: state.futureAdjustedMarkerMaterial,
						selected: state.selectedMarkerMaterial
					}
				);
			}
		},
		setup(app: TTrajectoryApp) {
			const { futureLine, pastLine, noteMarkerGroup } = app.r.trajectoryState;

			const futureEid = app.createEntity();
			app.addComponent(futureEid, app.c.MeshMixin, { type: 'three', object: futureLine });

			const pastEid = app.createEntity();
			app.addComponent(pastEid, app.c.MeshMixin, { type: 'three', object: pastLine });

			const markersEid = app.createEntity();
			app.addComponent(markersEid, app.c.MeshMixin, { type: 'three', object: noteMarkerGroup });

			cleanupMarkerInteraction = setupTrajectoryMarkerInteraction(app);
			app.addSystem(updateTrajectorySystem, { set: 'PostUpdate' });
		}
	};
}
