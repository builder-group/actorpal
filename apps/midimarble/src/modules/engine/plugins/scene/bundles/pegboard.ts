import { bundleEntry, defineBundle } from 'ecsify';
import * as THREE from 'three';
import { TVec3 } from '../../../types';
import type { TCAuthoredTransformMixin, TCPegboardMixin, TSceneApp } from '../types';
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

	const authoredTransform = {
		position,
		rotation,
		scale
	} satisfies TCAuthoredTransformMixin;
	const pegboard = {
		width,
		height,
		repeatWorldSize
	} satisfies TCPegboardMixin;

	return defineBundle(
		bundleEntry(app.c.PositionMixin, position),
		bundleEntry(app.c.RotationMixin, rotation),
		bundleEntry(app.c.ScaleMixin, scale),
		bundleEntry(app.c.AuthoredTransformMixin, authoredTransform),
		bundleEntry(app.c.SceneElementMixin, {
			kind: 'pegboard',
			label: 'Pegboard',
			editable: false
		}),
		bundleEntry(app.c.PegboardMixin, pegboard),
		bundleEntry(app.c.MeshMixin, {
			type: 'three',
			object: createPegboardObject(width, height, repeatWorldSize)
		})
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

export function createPegboardObject(
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
