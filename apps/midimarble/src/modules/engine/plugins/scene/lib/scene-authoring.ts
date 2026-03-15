import { Entity, With } from 'ecsify';
import type {
	TCAuthoredTransformMixin,
	TCMarblePhysicsMixin,
	TCNotePlatformMixin,
	TCStraightTrackMixin,
	TSceneApp
} from '../types';

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

export function updateStraightTrackTransformAuthoring(
	app: TSceneApp,
	entityId: number,
	patch: Partial<TCAuthoredTransformMixin>
): boolean {
	for (const [eid, transform] of app.queryComponents(
		[Entity, app.c.AuthoredTransformMixin] as const,
		With(app.c.StraightTrackMixin)
	)) {
		if (eid !== entityId) {
			continue;
		}

		const next = { ...transform, ...patch };
		app.updateComponent(entityId, app.c.AuthoredTransformMixin, next);
		app.updateComponent(entityId, app.c.PositionMixin, next.position);
		app.updateComponent(entityId, app.c.RotationMixin, next.rotation);
		app.updateComponent(entityId, app.c.ScaleMixin, next.scale);
		return true;
	}

	return false;
}

export function updateStraightTrackGeometryAuthoring(
	app: TSceneApp,
	entityId: number,
	patch: Partial<TCStraightTrackMixin & { length: number }>
): boolean {
	for (const [eid, track, linear] of app.queryComponents(
		[Entity, app.c.StraightTrackMixin, app.c.LinearElementMixin] as const,
		With(app.c.StraightTrackMixin)
	)) {
		if (eid !== entityId) {
			continue;
		}

		const { length, ...trackPatch } = patch;
		app.updateComponent(entityId, app.c.StraightTrackMixin, { ...track, ...trackPatch });
		if (length != null) {
			app.updateComponent(entityId, app.c.LinearElementMixin, { ...linear, length });
		}
		return true;
	}

	return false;
}

function areNotePlatformsEqual(left: TCNotePlatformMixin, right: TCNotePlatformMixin): boolean {
	return (
		left.offsetY === right.offsetY &&
		left.offsetZ === right.offsetZ &&
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
