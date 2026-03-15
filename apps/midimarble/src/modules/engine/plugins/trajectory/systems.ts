import { Entity, With } from 'ecsify';
import { stepToTick } from '../midi';
import {
	clearTrajectoryVisuals,
	setTrajectoryLinePointSlice,
	syncTrajectoryLineColors
} from './lib/line-state';
import {
	buildProjectedMarkers,
	buildTrajectoryMarkerDescriptors,
	buildTrajectoryProjection,
	syncTrajectoryMarkerDescriptorStyles,
	syncTrajectoryMarkers
} from './lib/note-markers';
import {
	shouldExtendTrajectorySamples,
	shouldRebuildTrajectorySamples,
	shouldRefreshTrajectoryPresentation,
	shouldRefreshTrajectoryProjection
} from './lib/refresh';
import {
	extendTrajectorySampleCache,
	rebuildTrajectorySampleCache
} from './lib/trajectory-samples';
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

	if (app.r.simulationSync.mode !== 'idle') {
		clearTrajectoryVisuals(app);
		return;
	}

	const sourceEid = resolveTrajectorySourceEntity(app);
	if (sourceEid == null) {
		clearTrajectoryVisuals(app);
		return;
	}

	const marbleBody = app.r.rigidBodies.get(sourceEid);
	if (marbleBody == null) {
		clearTrajectoryVisuals(app);
		return;
	}

	let didRebuildSamples = false;
	let didExtendSamples = false;

	if (shouldRebuildTrajectorySamples(app) || state.sampledEndStep < 0) {
		const nextCache = rebuildTrajectorySampleCache(app, marbleBody.handle);
		if (nextCache == null) {
			clearTrajectoryVisuals(app);
			return;
		}

		state.sampledPoints = nextCache.points;
		state.sampledEndStep = nextCache.endStep;
		didRebuildSamples = true;
	} else if (shouldExtendTrajectorySamples(app)) {
		const nextCache = extendTrajectorySampleCache(app, marbleBody.handle, {
			points: state.sampledPoints,
			endStep: state.sampledEndStep
		});
		if (nextCache == null) {
			clearTrajectoryVisuals(app);
			return;
		}

		if (nextCache.endStep !== state.sampledEndStep) {
			state.sampledPoints = nextCache.points;
			state.sampledEndStep = nextCache.endStep;
			didExtendSamples = true;
		}
	}

	if (!shouldRefreshTrajectoryPresentation(app) && !didRebuildSamples && !didExtendSamples) {
		return;
	}

	if (isPreviewEnabled) {
		return;
	}

	syncTrajectoryLines(app);

	const bufferedTick =
		app.r.midiSong == null
			? -1
			: Math.round(stepToTick(state.sampledEndStep, app.r.midiSong, app.r.fixedTimeStepSeconds));
	const shouldRefreshProjection =
		didRebuildSamples ||
		didExtendSamples ||
		shouldRefreshTrajectoryProjection(app, state.projectedTrackId, state.projectedBufferedTick);

	if (!shouldRefreshProjection) {
		return;
	}

	const didRewindProjection =
		app.wasResourceChanged('midiSong') ||
		app.wasResourceChanged('selectedTrackId') ||
		state.projectedTrackId !== app.r.selectedTrackId ||
		state.projectedBufferedTick > bufferedTick ||
		state.projectedBufferedTick < 0;
	const markers = buildTrajectoryMarkerDescriptors(
		app.r.midiSong,
		app.r.midiLookup,
		app.r.selectedTrackId,
		didRewindProjection ? -1 : state.projectedBufferedTick,
		bufferedTick,
		app.r.fixedTimeStepSeconds,
		{
			points: state.sampledPoints,
			endStep: state.sampledEndStep
		}
	);

	if (didRewindProjection) {
		syncTrajectoryMarkers(
			state.noteMarkerGroup,
			state.noteIdToMarker,
			state.markerToNoteId,
			state.futureMarkerMaterial,
			state.markerGeometry,
			markers
		);
		state.projectedTrackId = app.r.selectedTrackId;
		state.projectedBufferedTick = bufferedTick;
		state.projectedMarkers = buildProjectedMarkers(markers);
		app.updateResource('trajectoryProjection', {
			noteAnchorsById: buildTrajectoryProjection(markers)
		});
		syncTrajectoryMarkerDescriptorStyles(
			state.noteIdToMarker,
			markers,
			app.r.selectedNoteIds,
			app.r.liveStep,
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
		return;
	}

	syncTrajectoryMarkers(
		state.noteMarkerGroup,
		state.noteIdToMarker,
		state.markerToNoteId,
		state.futureMarkerMaterial,
		state.markerGeometry,
		markers,
		false
	);

	if (markers.length > 0) {
		state.projectedMarkers.push(...buildProjectedMarkers(markers));
	}
	state.projectedTrackId = app.r.selectedTrackId;
	state.projectedBufferedTick = bufferedTick;
	if (markers.length === 0) {
		return;
	}
	const nextAnchors = new Map(app.r.trajectoryProjection.noteAnchorsById);
	for (const [noteId, anchor] of buildTrajectoryProjection(markers)) {
		nextAnchors.set(noteId, anchor);
	}
	app.updateResource('trajectoryProjection', {
		noteAnchorsById: nextAnchors
	});
	syncTrajectoryMarkerDescriptorStyles(
		state.noteIdToMarker,
		markers,
		app.r.selectedNoteIds,
		app.r.liveStep,
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
}

function syncTrajectoryLines(app: TTrajectoryApp): void {
	const state = app.r.trajectoryState;
	if (state.sampledEndStep < 0 || state.sampledPoints.length === 0) {
		state.pastLine.geometry.setDrawRange(0, 0);
		state.futureLine.geometry.setDrawRange(0, 0);
		return;
	}

	const liveStep = Math.max(0, Math.min(app.r.liveStep, state.sampledEndStep));
	const pastCount = Math.max(0, liveStep + 1);
	const futureCount = Math.max(0, state.sampledEndStep - liveStep + 1);

	setTrajectoryLinePointSlice(state.pastLine, state.sampledPoints, 0, pastCount);
	setTrajectoryLinePointSlice(state.futureLine, state.sampledPoints, liveStep, futureCount);
}

function resolveTrajectorySourceEntity(app: TTrajectoryApp): number | null {
	for (const [eid] of app.queryComponents([Entity] as const, With(app.c.TrajectorySourceTag))) {
		return eid;
	}

	return null;
}
