import { Entity } from 'ecsify';
import type { TSceneApp } from './types';

export function animateFallingMarblesSystem(app: TSceneApp, dt = 0) {
	for (const [eid, position, rotation, fallingMarble] of app.queryComponents([
		Entity,
		app.c.PositionMixin,
		app.c.RotationMixin,
		app.c.FallingMarbleMixin
	] as const)) {
		const nextY = position.y - fallingMarble.speed * dt;
		app.updateComponent(eid, app.c.PositionMixin, {
			x: position.x,
			y: nextY < fallingMarble.resetY ? fallingMarble.startY : nextY,
			z: position.z
		});
		app.updateComponent(eid, app.c.RotationMixin, {
			x: rotation.x + fallingMarble.spinX * dt,
			y: rotation.y + fallingMarble.spinY * dt,
			z: rotation.z + fallingMarble.spinZ * dt
		});
	}
}
