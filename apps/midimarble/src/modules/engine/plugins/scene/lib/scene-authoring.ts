import { Entity, With } from 'ecsify';
import type { TCMarblePhysicsMixin, TCNotePlatformMixin, TSceneApp } from '../types';

export function updateNotePlatformAuthoring(
	app: TSceneApp,
	entityId: number,
	patch: Partial<TCNotePlatformMixin>
): boolean {
	for (const [eid, platform] of app.queryComponents(
		[Entity, app.c.NotePlatformMixin] as const,
		With(app.c.NotePlatformMixin)
	)) {
		if (eid !== entityId) {
			continue;
		}

		const nextPlatform = {
			...platform,
			...patch
		};
		if (areNotePlatformsEqual(platform, nextPlatform)) {
			return false;
		}

		app.updateComponent(entityId, app.c.NotePlatformMixin, nextPlatform);
		return true;
	}

	return false;
}

export function updateMarblePhysicsAuthoring(
	app: TSceneApp,
	entityId: number,
	patch: Partial<TCMarblePhysicsMixin>
): boolean {
	for (const [eid, marblePhysics] of app.queryComponents(
		[Entity, app.c.MarblePhysicsMixin] as const,
		With(app.c.MarbleTag)
	)) {
		if (eid !== entityId) {
			continue;
		}

		const nextMarblePhysics = {
			...marblePhysics,
			...patch
		};
		if (areMarblePhysicsEqual(marblePhysics, nextMarblePhysics)) {
			return false;
		}

		app.updateComponent(entityId, app.c.MarblePhysicsMixin, nextMarblePhysics);
		return true;
	}

	return false;
}

function areNotePlatformsEqual(left: TCNotePlatformMixin, right: TCNotePlatformMixin): boolean {
	return (
		left.rotationX === right.rotationX &&
		left.length === right.length &&
		left.width === right.width &&
		left.thickness === right.thickness &&
		left.bounce === right.bounce &&
		left.color === right.color
	);
}

function areMarblePhysicsEqual(left: TCMarblePhysicsMixin, right: TCMarblePhysicsMixin): boolean {
	return left.bounce === right.bounce;
}
