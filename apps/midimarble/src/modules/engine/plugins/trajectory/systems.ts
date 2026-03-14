import { Entity, With } from 'ecsify';
import { findTrackById } from '../midi';
import {
	clearTrajectoryVisuals,
	setTrajectoryLinePoints,
	syncTrajectoryLineColors
} from './lib/line-state';
import {
	buildTrajectoryMarkerDescriptors,
	buildTrajectoryProjection,
	syncTrajectoryMarkers
} from './lib/note-markers';
import { shouldRefreshTrajectory } from './lib/refresh';
import { rebuildTrajectorySamples } from './lib/trajectory-samples';
import type { TTrajectoryApp } from './types';

export function updateTrajectorySystem(app: TTrajectoryApp) {
	const config = app.r.trajectoryConfig;
	const state = app.r.trajectoryState;
	const isPreviewEnabled = app.r.previewConfig.enabled;

	state.futureLine.visible = config.enabled && !isPreviewEnabled;
	state.pastLine.visible = config.enabled && !isPreviewEnabled;
	state.noteMarkerGroup.visible = config.enabled && !isPreviewEnabled;

	if (!config.enabled || !app.r.isReady) {
		clearTrajectoryVisuals(app);
		return;
	}

	syncTrajectoryLineColors(app);

	if (!shouldRefreshTrajectory(app)) {
		return;
	}

	if (app.r.simulationSync.mode !== 'idle') {
		clearTrajectoryVisuals(app);
		return;
	}

	let sourceEid: number | null = null;
	for (const [eid] of app.queryComponents([Entity] as const, With(app.c.TrajectorySourceTag))) {
		sourceEid = eid;
		break;
	}
	if (sourceEid == null) {
		clearTrajectoryVisuals(app);
		return;
	}

	const marbleBody = app.r.rigidBodies.get(sourceEid);
	if (marbleBody == null) {
		clearTrajectoryVisuals(app);
		return;
	}

	const samples = rebuildTrajectorySamples(app, marbleBody.handle);
	if (samples == null) {
		clearTrajectoryVisuals(app);
		return;
	}

	setTrajectoryLinePoints(state.pastLine, samples.pastPoints, samples.pastCount);
	setTrajectoryLinePoints(state.futureLine, samples.futurePoints, samples.futureCount);

	const selectedTrack = findTrackById(app.r.midiSong, app.r.selectedTrackId);
	const markers = buildTrajectoryMarkerDescriptors(
		app.r.midiSong,
		selectedTrack,
		app.r.selectedNoteId,
		app.r.liveStep,
		app.r.bufferedStep,
		app.r.fixedTimeStepSeconds,
		samples.positionsByStep
	);
	const noteAnchorsById = buildTrajectoryProjection(markers);
	app.updateResource('trajectoryProjection', { noteAnchorsById });

	syncTrajectoryMarkers(
		state.noteMarkerGroup,
		state.noteIdToMarker,
		state.markerToNoteId,
		{
			past: state.pastMarkerMaterial,
			future: state.futureMarkerMaterial,
			selected: state.selectedMarkerMaterial
		},
		state.markerGeometry,
		markers
	);
}
