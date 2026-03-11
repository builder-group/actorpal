import * as THREE from 'three';
import { TVec3 } from '../../../types';
import { bundleEntry, defineBundle } from '../../core';
import type { TSceneApp } from '../types';
import type { TSceneBundle } from './types';

export function createPegboardBundle(
	app: TSceneApp,
	options: TCreatePegboardBundleOptions = {}
): TSceneBundle {
	const {
		position = { x: -8, y: 0, z: 8 },
		rotation = { x: 0, y: Math.PI / 2, z: 0 },
		scale = { x: 1, y: 1, z: 1 },
		width = 120,
		height = 120,
		repeatWorldSize = 14.75
	} = options;

	return defineBundle(
		bundleEntry(app.c.PositionMixin, position),
		bundleEntry(app.c.RotationMixin, rotation),
		bundleEntry(app.c.ScaleMixin, scale),
		bundleEntry(app.c.MeshMixin, {
			type: 'three',
			object: createPegboardObject(width, height, repeatWorldSize)
		}),
		bundleEntry(app.c.PegboardMixin)
	);
}

interface TCreatePegboardBundleOptions {
	position?: TVec3;
	rotation?: TVec3;
	scale?: TVec3;
	width?: number;
	height?: number;
	repeatWorldSize?: number;
}

function createPegboardObject(
	width: number,
	height: number,
	repeatWorldSize: number
): THREE.Object3D {
	const normalTexture = new THREE.TextureLoader().load('/textures/pegboard-normals.jpg');
	normalTexture.wrapS = THREE.RepeatWrapping;
	normalTexture.wrapT = THREE.RepeatWrapping;
	normalTexture.repeat.set(width / repeatWorldSize, height / repeatWorldSize);

	const board = new THREE.Mesh(
		new THREE.PlaneGeometry(width, height),
		new THREE.MeshStandardMaterial({
			color: '#f6efe6',
			dithering: true,
			normalMap: normalTexture,
			bumpMap: normalTexture
		})
	);
	board.receiveShadow = true;
	return board;
}
