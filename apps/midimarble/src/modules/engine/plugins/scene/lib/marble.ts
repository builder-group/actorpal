import { Entity, With } from 'ecsify';
import type { TBallColliderDescriptor } from '../../physics';
import type { TSceneApp } from '../types';

export const DEFAULT_MARBLE_RADIUS = 0.36;

export const MARBLE_PHYSICS_DEFAULTS = {
	bounce: 0.32
} as const;

export const MARBLE_PHYSICS_LIMITS = {
	bounce: {
		min: 0,
		max: 0.9
	}
} as const;

export function createMarbleColliderDescriptors(
	radius: number,
	bounce: number
): TBallColliderDescriptor[] {
	return [
		{
			shape: 'ball',
			radius,
			density: 1.25,
			friction: 0.12,
			restitution: bounce,
			restitutionCombineRule: 'max'
		}
	];
}

export function getMarbleRadius(
	descriptors: TSceneApp['c']['ColliderMixin'][number]['descriptors']
): number {
	const descriptor = descriptors.find(
		(entry): entry is TBallColliderDescriptor => entry.shape === 'ball'
	);
	return descriptor?.radius ?? DEFAULT_MARBLE_RADIUS;
}

export function getMarbleEntityId(app: TSceneApp): number | null {
	for (const eid of app.queryEntities(With(app.c.MarbleTag))) {
		return eid;
	}

	return null;
}

export function getMarblePhysics(
	app: TSceneApp,
	entityId: number
): TSceneApp['c']['MarblePhysicsMixin'][number] | null {
	for (const [eid, marblePhysics] of app.queryComponents(
		[Entity, app.c.MarblePhysicsMixin] as const,
		With(app.c.MarbleTag)
	)) {
		if (eid === entityId) {
			return marblePhysics;
		}
	}

	return null;
}
