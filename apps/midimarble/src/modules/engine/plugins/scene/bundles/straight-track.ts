import { bundleEntry, defineBundle } from 'ecsify';
import * as THREE from 'three';
import { TVec3 } from '../../../types';
import type { TPhysicsColliderDescriptor } from '../../physics';
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
		length = 14,
		height = 0.7,
		width = 1.5,
		channelWidth = 1.3,
		channelDepth = 0.2,
		color = ['#2a5e92', '#ffeead', '#ff9943', '#8ac6d6'][Math.floor(Math.random() * 4)]
	} = options;

	const authoredTransform = {
		position,
		rotation,
		scale
	} satisfies TCAuthoredTransformMixin;
	const linearElement = {
		length,
		minLength: 6,
		maxLength: 28,
		handleOffset: 0.8
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
	const wallWidth = (track.width - track.channelWidth) / 2;

	return [
		{
			shape: 'cuboid',
			halfExtents: {
				x: track.width / 2 - wallWidth,
				y: (track.height - track.channelDepth * 2) / 2,
				z: track.length / 2
			},
			translation: { x: 0, y: 0, z: 0 },
			friction: 0.5
		},
		{
			shape: 'cuboid',
			halfExtents: { x: wallWidth / 2, y: track.height / 2, z: track.length / 2 },
			translation: { x: -(track.width / 2) + wallWidth / 2, y: 0, z: 0 },
			friction: 0.5
		},
		{
			shape: 'cuboid',
			halfExtents: { x: wallWidth / 2, y: track.height / 2, z: track.length / 2 },
			translation: { x: track.width / 2 - wallWidth / 2, y: 0, z: 0 },
			friction: 0.5
		}
	];
}

export function createStraightTrackGeometry(
	track: TStraightTrackShapeConfig
): THREE.ExtrudeGeometry {
	const profile = createTrackProfile(
		track.height,
		track.width,
		track.channelWidth,
		track.channelDepth
	);
	const geometry = new THREE.ExtrudeGeometry(profile, {
		steps: 1,
		depth: track.length,
		bevelEnabled: true,
		bevelThickness: 0,
		bevelSize: 0
	});

	geometry.translate(-track.width / 2, 0, -track.length / 2);
	geometry.computeVertexNormals();
	return geometry;
}

function createTrackProfile(
	height: number,
	width: number,
	channelWidth: number,
	channelDepth: number
): THREE.Shape {
	const wallWidth = (width - channelWidth) / 2;
	const profile = new THREE.Shape();

	profile.moveTo(0, 0);
	profile.lineTo(0, -height / 2);
	profile.lineTo(wallWidth, -height / 2);
	profile.lineTo(wallWidth, -height / 2 + channelDepth);
	profile.lineTo(wallWidth + channelWidth, -height / 2 + channelDepth);
	profile.lineTo(wallWidth + channelWidth, -height / 2);
	profile.lineTo(width, -height / 2);
	profile.lineTo(width, height / 2);
	profile.lineTo(wallWidth + channelWidth, height / 2);
	profile.lineTo(wallWidth + channelWidth, height / 2 - channelDepth);
	profile.lineTo(wallWidth, height / 2 - channelDepth);
	profile.lineTo(wallWidth, height / 2);
	profile.lineTo(0, height / 2);
	profile.lineTo(0, 0);

	return profile;
}

type TStraightTrackShapeConfig = Pick<
	TCStraightTrackMixin,
	'height' | 'width' | 'channelWidth' | 'channelDepth'
> & { length: number };
