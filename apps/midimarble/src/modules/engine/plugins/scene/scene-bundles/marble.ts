import { bundleEntry, defineBundle } from 'ecsify';
import * as THREE from 'three';
import { TVec3 } from '../../../types';
import type { TSceneApp } from '../types';
import type { TSceneBundle } from './types';

export function createMarbleBundle(
	app: TSceneApp,
	options: TCreateMarbleBundleOptions = {}
): TSceneBundle {
	const {
		radius = 0.36,
		position = { x: 0, y: 6, z: -7 },
		rotation = { x: 0, y: 0, z: 0 },
		scale = { x: 1, y: 1, z: 1 }
	} = options;

	return defineBundle(
		bundleEntry(app.c.PositionMixin, position),
		bundleEntry(app.c.RotationMixin, rotation),
		bundleEntry(app.c.ScaleMixin, scale),
		bundleEntry(app.c.MeshMixin, { type: 'three', object: createMarbleObject(radius) }),
		bundleEntry(app.c.MarbleMixin, { radius }),
		bundleEntry(app.c.RigidBodyMixin, {
			kind: 'dynamic',
			canSleep: false,
			linearDamping: 0.1,
			angularDamping: 0.15
		}),
		bundleEntry(app.c.ColliderMixin, {
			descriptors: [
				{
					shape: 'ball',
					radius,
					density: 1.25,
					friction: 0.18,
					restitution: 0.05
				}
			]
		})
	);
}

export interface TCreateMarbleBundleOptions {
	position?: TVec3;
	rotation?: TVec3;
	scale?: TVec3;
	radius?: number;
}

function createMarbleObject(radius: number): THREE.Object3D {
	const marble = new THREE.Mesh(
		new THREE.SphereGeometry(radius, 48, 48),
		new THREE.MeshStandardMaterial({
			color: '#c6525b',
			roughness: 0.18,
			metalness: 0.12
		})
	);
	marble.castShadow = true;
	marble.receiveShadow = true;
	return marble;
}
