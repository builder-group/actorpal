import { Added, Or, Removed } from 'ecsify';
import { stepToTick } from '../../midi';
import type { TTrajectoryApp } from '../types';

export function shouldRebuildTrajectorySamples(app: TTrajectoryApp): boolean {
	return (
		app.wasResourceAdded('midiSong') ||
		app.wasResourceChanged('midiSong') ||
		app.wasResourceChanged('simulationSync') ||
		app.wasResourceChanged('fixedTimeStepSeconds') ||
		app.queryEntities(Or(Added(app.c.TrajectorySourceTag), Removed(app.c.TrajectorySourceTag)))
			.length > 0
	);
}

export function shouldExtendTrajectorySamples(app: TTrajectoryApp): boolean {
	return app.wasResourceChanged('bufferedStep');
}

export function shouldRefreshTrajectoryProjection(
	app: TTrajectoryApp,
	projectedTrackId: number | null,
	projectedBufferedTick: number
): boolean {
	const nextBufferedTick =
		app.r.midiSong == null
			? -1
			: Math.round(stepToTick(app.r.bufferedStep, app.r.midiSong, app.r.fixedTimeStepSeconds));

	return (
		app.wasResourceChanged('midiSong') ||
		app.wasResourceChanged('selectedTrackId') ||
		projectedTrackId !== app.r.selectedTrackId ||
		projectedBufferedTick !== nextBufferedTick
	);
}

export function shouldRefreshTrajectoryPresentation(app: TTrajectoryApp): boolean {
	return (
		shouldRebuildTrajectorySamples(app) ||
		shouldExtendTrajectorySamples(app) ||
		app.wasResourceChanged('previewConfig') ||
		app.wasResourceChanged('liveStep') ||
		app.wasResourceChanged('selectedNoteIds')
	);
}
