import type { TCoreApp } from './types';

export function elapsedTimeSystem(app: TCoreApp, dt = 0) {
	app.r.elapsedSeconds += dt;
}
