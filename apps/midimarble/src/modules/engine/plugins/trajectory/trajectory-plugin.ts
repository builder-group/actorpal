import * as THREE from 'three';
import { trajectoryConfig } from './config';
import { buildTrajectoryLine } from './lib/line-state';
import { setupTrajectoryMarkerInteraction } from './lib/marker-interaction';
import {
	syncPlacedNoteMarkers,
	syncNoteMarkerPhase as syncTrajectoryNoteMarkerPhase
} from './lib/note-markers';
import { updateTrajectorySystem } from './systems';
import type { TTrajectoryApp, TTrajectoryNoteMarkerState, TTrajectoryPlugin } from './types';

export function createTrajectoryPlugin(options?: {
	trajectoryConfig?: { enabled?: boolean; futureColor?: string; pastColor?: string };
}): TTrajectoryPlugin {
	const futureColor =
		options?.trajectoryConfig?.futureColor ?? trajectoryConfig.defaults.futureColor;
	const pastColor = options?.trajectoryConfig?.pastColor ?? trajectoryConfig.defaults.pastColor;
	const { colors } = trajectoryConfig.marker;
	const noteMarkerGroup = new THREE.Group();
	const markerGeometry = new THREE.SphereGeometry(1, 14, 14);
	const pastMarkerMaterial = new THREE.MeshBasicMaterial({ color: colors.past });
	const pastPlacedMarkerMaterial = new THREE.MeshBasicMaterial({ color: colors.pastPlaced });
	const pastAdjustedMarkerMaterial = new THREE.MeshBasicMaterial({ color: colors.pastAdjusted });
	const futureMarkerMaterial = new THREE.MeshBasicMaterial({ color: colors.future });
	const futurePlacedMarkerMaterial = new THREE.MeshBasicMaterial({ color: colors.futurePlaced });
	const futureAdjustedMarkerMaterial = new THREE.MeshBasicMaterial({
		color: colors.futureAdjusted
	});
	const selectedMarkerMaterial = new THREE.MeshBasicMaterial({ color: colors.selected });
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
				enabled: options?.trajectoryConfig?.enabled ?? trajectoryConfig.defaults.enabled,
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
				sampledPoints: new Float32Array(0),
				sampledEndStep: -1,
				projectedTrackId: null,
				projectedBufferedTick: -1,
				projectedMarkers: [],
				styledLiveStep: 0,
				lastNoteMarkerState: {
					placedNoteIds: new Set<number>(),
					adjustedNoteIds: new Set<number>()
				},
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
				if (this.r.previewConfig.enabled) {
					return;
				}

				const state = this.r.trajectoryState;
				state.lastNoteMarkerState = noteState;
				state.styledLiveStep = this.r.liveStep;
				syncPlacedNoteMarkers(
					state.noteIdToMarker,
					this.r.trajectoryProjection.noteAnchorsById,
					this.r.selectedNoteIds,
					this.r.liveStep,
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
			},
			syncNoteMarkerPhase(this: TTrajectoryApp): void {
				if (this.r.previewConfig.enabled) {
					return;
				}

				const state = this.r.trajectoryState;
				if (state.projectedMarkers.length === 0 || state.styledLiveStep === this.r.liveStep) {
					state.styledLiveStep = this.r.liveStep;
					return;
				}

				syncTrajectoryNoteMarkerPhase(
					state.noteIdToMarker,
					this.r.trajectoryProjection.noteAnchorsById,
					state.projectedMarkers,
					state.styledLiveStep,
					this.r.liveStep,
					this.r.selectedNoteIds,
					state.lastNoteMarkerState,
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
				state.styledLiveStep = this.r.liveStep;
			},
			updateTrajectoryConfig(
				this: TTrajectoryApp,
				patch: Partial<TTrajectoryApp['r']['trajectoryConfig']>
			): void {
				this.updateResource('trajectoryConfig', {
					...this.r.trajectoryConfig,
					...patch
				});
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
