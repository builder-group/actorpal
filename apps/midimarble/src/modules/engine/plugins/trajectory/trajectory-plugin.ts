import * as THREE from 'three';
import { buildTrajectoryLine } from './lib/line-state';
import { setupTrajectoryMarkerInteraction } from './lib/marker-interaction';
import { updateTrajectorySystem } from './systems';
import type { TTrajectoryApp, TTrajectoryPlugin } from './types';

export function createTrajectoryPlugin(): TTrajectoryPlugin {
	const futureColor = '#4a90e2';
	const pastColor = '#ff9943';
	const noteMarkerGroup = new THREE.Group();
	const markerGeometry = new THREE.SphereGeometry(1, 14, 14);
	const pastMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#ffb05b' });
	const futureMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#68aef2' });
	const selectedMarkerMaterial = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
	let cleanupMarkerInteraction: (() => void) | null = null;

	return {
		// Trajectory is a separate authoring surface driven by physics state.
		name: 'Trajectory',
		deps: ['Default', 'Core', 'Midi', 'Transport', 'Physics', 'Render'],
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
				futureMarkerMaterial,
				selectedMarkerMaterial
			}
		},
		appExtensions: {
			disposeTrajectory(this: TTrajectoryApp): void {
				cleanupMarkerInteraction?.();
				cleanupMarkerInteraction = null;
				const state = this.r.trajectoryState;
				state.markerGeometry.dispose();
				state.pastMarkerMaterial.dispose();
				state.futureMarkerMaterial.dispose();
				state.selectedMarkerMaterial.dispose();
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
