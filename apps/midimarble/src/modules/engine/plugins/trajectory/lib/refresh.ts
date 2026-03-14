import { Added, Or, Removed } from 'ecsify';
import type { TTrajectoryApp } from '../types';

export function shouldRefreshTrajectory(app: TTrajectoryApp): boolean {
	return (
		app.wasResourceAdded('trajectoryConfig') ||
		app.wasResourceChanged('trajectoryConfig') ||
		app.wasResourceChanged('liveStep') ||
		app.wasResourceChanged('world') ||
		app.wasResourceChanged('simulationSync') ||
		app.queryEntities(Or(Added(app.c.TrajectorySourceTag), Removed(app.c.TrajectorySourceTag)))
			.length > 0
	);
}
