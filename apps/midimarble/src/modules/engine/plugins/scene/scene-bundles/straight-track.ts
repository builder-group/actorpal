import * as THREE from 'three';
import { TVec3 } from '../../../types';
import { bundleEntry, defineBundle } from '../../core';
import type { TPhysicsColliderDescriptor } from '../../physics';
import type { TSceneApp } from '../types';
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

	return defineBundle(
		bundleEntry(app.c.PositionMixin, position),
		bundleEntry(app.c.RotationMixin, rotation),
		bundleEntry(app.c.ScaleMixin, scale),
		bundleEntry(app.c.MeshMixin, {
			type: 'three',
			object: createStraightTrackObject(
				length,
				height,
				width,
				channelWidth,
				channelDepth,
				color as string
			)
		}),
		bundleEntry(app.c.StraightTrackMixin),
		bundleEntry(app.c.RigidBodyMixin, { kind: 'fixed' }),
		bundleEntry(app.c.ColliderMixin, {
			descriptors: createStraightTrackColliders(length, height, width, channelWidth, channelDepth)
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

function createStraightTrackObject(
	length: number,
	height: number,
	width: number,
	channelWidth: number,
	channelDepth: number,
	color: string
): THREE.Object3D {
	const geometry = createStraightTrackGeometry(length, height, width, channelWidth, channelDepth);
	const material = new THREE.MeshStandardMaterial({
		color,
		roughness: 0.74,
		metalness: 0.04
	});

	const mesh = new THREE.Mesh(geometry, material);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

function createStraightTrackColliders(
	length: number,
	height: number,
	width: number,
	channelWidth: number,
	channelDepth: number
): TPhysicsColliderDescriptor[] {
	const wallWidth = (width - channelWidth) / 2;

	return [
		{
			shape: 'cuboid',
			halfExtents: {
				x: width / 2 - wallWidth,
				y: (height - channelDepth * 2) / 2,
				z: length / 2
			},
			translation: { x: 0, y: 0, z: 0 },
			friction: 0.5
		},
		{
			shape: 'cuboid',
			halfExtents: { x: wallWidth / 2, y: height / 2, z: length / 2 },
			translation: { x: -(width / 2) + wallWidth / 2, y: 0, z: 0 },
			friction: 0.5
		},
		{
			shape: 'cuboid',
			halfExtents: { x: wallWidth / 2, y: height / 2, z: length / 2 },
			translation: { x: width / 2 - wallWidth / 2, y: 0, z: 0 },
			friction: 0.5
		}
	];
}

function createStraightTrackGeometry(
	length: number,
	height: number,
	width: number,
	channelWidth: number,
	channelDepth: number
): THREE.ExtrudeGeometry {
	const profile = createTrackProfile(height, width, channelWidth, channelDepth);
	const geometry = new THREE.ExtrudeGeometry(profile, {
		steps: 1,
		depth: length,
		bevelEnabled: true,
		bevelThickness: 0,
		bevelSize: 0
	});

	geometry.translate(-width / 2, 0, -length / 2);
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
