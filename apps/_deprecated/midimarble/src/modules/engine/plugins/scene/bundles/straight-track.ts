import { bundleEntry, defineBundle } from 'ecsify';
import * as THREE from 'three';
import { TVec3 } from '../../../types';
import type { TPhysicsColliderDescriptor } from '../../physics';
import { sceneConfig } from '../config';
import { createTrackColliders, createTrackGeometry } from '../lib/track-shape';
import type {
	TCAuthoredTransformMixin,
	TCLinearElementMixin,
	TCStraightTrackMixin,
	TSceneApp
} from '../types';
import type { TSceneBundle } from './types';

export function createStraightTrackBundle(
	app: TSceneApp,
	options: TCreateStraightTrackBundleOptions = {}
): TSceneBundle {
	const {
		position = { x: 0, y: 0, z: 0 },
		rotation = { x: 0, y: 0, z: 0 },
		scale = { x: 1, y: 1, z: 1 },
		length = sceneConfig.track.defaultLength,
		height = sceneConfig.track.defaultHeight,
		width = sceneConfig.track.defaultWidth,
		channelWidth = sceneConfig.track.defaultChannelWidth,
		channelDepth = sceneConfig.track.defaultChannelDepth,
		color = sceneConfig.track.colorPalette[
			Math.floor(Math.random() * sceneConfig.track.colorPalette.length)
		]
	} = options;

	const authoredTransform = {
		position,
		rotation,
		scale
	} satisfies TCAuthoredTransformMixin;
	const linearElement = {
		length,
		minLength: sceneConfig.track.minLength,
		maxLength: sceneConfig.track.maxLength,
		handleOffset: sceneConfig.track.handleOffset
	} satisfies TCLinearElementMixin;
	const track = {
		height,
		width,
		channelWidth,
		channelDepth,
		color: color as string
	} satisfies TCStraightTrackMixin;

	return defineBundle(
		bundleEntry(app.c.PositionMixin, position),
		bundleEntry(app.c.RotationMixin, rotation),
		bundleEntry(app.c.ScaleMixin, scale),
		bundleEntry(app.c.AuthoredTransformMixin, authoredTransform),
		bundleEntry(app.c.StraightTrackMixin, track),
		bundleEntry(app.c.LinearElementMixin, linearElement),
		bundleEntry(app.c.MeshMixin, {
			type: 'three',
			object: createStraightTrackObject({ ...track, length })
		}),
		bundleEntry(app.c.RigidBodyMixin, { kind: 'fixed' }),
		bundleEntry(app.c.ColliderMixin, {
			descriptors: createStraightTrackColliders({ ...track, length })
		})
	);
}

export interface TCreateStraightTrackBundleOptions {
	position?: TVec3;
	rotation?: TVec3;
	scale?: TVec3;
	length?: number;
	height?: number;
	width?: number;
	channelWidth?: number;
	channelDepth?: number;
	color?: string;
}

export function createStraightTrackObject(
	track: TStraightTrackShapeConfig & Pick<TCStraightTrackMixin, 'color'>
): THREE.Object3D {
	const geometry = createStraightTrackGeometry(track);
	const material = new THREE.MeshStandardMaterial({
		color: track.color,
		roughness: 0.74,
		metalness: 0.04
	});

	const mesh = new THREE.Mesh(geometry, material);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

export function createStraightTrackColliders(
	track: TStraightTrackShapeConfig
): TPhysicsColliderDescriptor[] {
	return createTrackColliders(track, 'both', {
		friction: 0.5
	});
}

export function createStraightTrackGeometry(
	track: TStraightTrackShapeConfig
): THREE.ExtrudeGeometry {
	return createTrackGeometry(track, 'both');
}

type TStraightTrackShapeConfig = Pick<
	TCStraightTrackMixin,
	'height' | 'width' | 'channelWidth' | 'channelDepth'
> & { length: number };
