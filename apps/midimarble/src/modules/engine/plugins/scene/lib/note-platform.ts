import { Entity, With } from 'ecsify';
import * as THREE from 'three';
import type { TVec3 } from '../../../types';
import { DEFAULT_MARBLE_RADIUS } from './marble';
import { getLinearElementHandlePositions } from './linear-element';
import type { TSceneApp } from '../types';

export const NOTE_PLATFORM_DEFAULTS = {
	rotationX: 0,
	length: 1.2,
	width: 0.84,
	thickness: 0.22,
	bounce: 0.58,
	color: '#2a5e92'
} as const;

export const NOTE_PLATFORM_LIMITS = {
	rotationX: {
		min: -1.2,
		max: 1.2
	},
	length: {
		min: 0.8,
		max: 1.8
	},
	bounce: {
		min: 0,
		max: 0.9
	}
} as const;

export const NOTE_PLATFORM_HANDLE_OFFSET = 0.22;

const NOTE_PLATFORM_COLORS = ['#2a5e92', '#ffeead', '#ff9943', '#8ac6d6'] as const;

export function findNotePlatformEntityId(app: TSceneApp, noteId: number): number | null {
	for (const [eid, binding] of app.queryComponents(
		[Entity, app.c.NoteBindingMixin] as const,
		With(app.c.NotePlatformMixin)
	)) {
		if (binding.noteId === noteId) {
			return eid;
		}
	}

	return null;
}

export function getPlacedNoteIds(app: TSceneApp): Set<number> {
	const placedNoteIds = new Set<number>();
	for (const [, binding] of app.queryComponents(
		[Entity, app.c.NoteBindingMixin] as const,
		With(app.c.NotePlatformMixin)
	)) {
		placedNoteIds.add(binding.noteId);
	}
	return placedNoteIds;
}

export function getDefaultNotePlatformColor(noteId: number): string {
	return NOTE_PLATFORM_COLORS[Math.abs(noteId) % NOTE_PLATFORM_COLORS.length] ?? NOTE_PLATFORM_DEFAULTS.color;
}

export function getNotePlatform(
	app: TSceneApp,
	entityId: number
): {
	position: TSceneApp['c']['PositionMixin'][number];
	rotation: TSceneApp['c']['RotationMixin'][number];
	platform: TSceneApp['c']['NotePlatformMixin'][number];
} | null {
	for (const [eid, position, rotation, platform] of app.queryComponents(
		[Entity, app.c.PositionMixin, app.c.RotationMixin, app.c.NotePlatformMixin] as const,
		With(app.c.NotePlatformMixin)
	)) {
		if (eid === entityId) {
			return { position, rotation, platform };
		}
	}

	return null;
}

export function getNotePlatformHandlePositions(
	position: { x: number; y: number; z: number },
	rotationX: number,
	length: number
): { start: THREE.Vector3; end: THREE.Vector3 } {
	return getLinearElementHandlePositions(position, rotationX, length, NOTE_PLATFORM_HANDLE_OFFSET);
}

export function resolveNotePlatformTransform(
	anchorPosition: TVec3,
	rotationX: number,
	thickness: number,
	marbleRadius: number = DEFAULT_MARBLE_RADIUS
): { position: TVec3; rotation: TVec3 } {
	const normal = getNotePlatformSurfaceNormal(rotationX);
	const centerOffset = marbleRadius + thickness / 2;

	return {
		position: {
			x: anchorPosition.x - normal.x * centerOffset,
			y: anchorPosition.y - normal.y * centerOffset,
			z: anchorPosition.z - normal.z * centerOffset
		},
		rotation: {
			x: rotationX,
			y: 0,
			z: 0
		}
	};
}

export function getNotePlatformSurfaceNormal(rotationX: number): THREE.Vector3 {
	return new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rotationX, 0, 0)).normalize();
}
