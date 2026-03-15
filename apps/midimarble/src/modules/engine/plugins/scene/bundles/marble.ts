import { bundleEntry, defineBundle } from 'ecsify';
import * as THREE from 'three';
import { TVec3 } from '../../../types';
import { sceneConfig } from '../config';
import { createMarbleColliderDescriptors } from '../lib/marble';
import type { TSceneApp } from '../types';
import type { TSceneBundle } from './types';

export function createMarbleBundle(
	app: TSceneApp,
	options: TCreateMarbleBundleOptions = {}
): TSceneBundle {
	const {
		radius = sceneConfig.marble.defaultRadius,
		position = sceneConfig.marble.spawn.position,
		rotation = sceneConfig.marble.spawn.rotation,
		scale = { x: 1, y: 1, z: 1 }
	} = options;

	return defineBundle(
		bundleEntry(app.c.PositionMixin, position),
		bundleEntry(app.c.RotationMixin, rotation),
		bundleEntry(app.c.ScaleMixin, scale),
		bundleEntry(app.c.MarbleTag, {}),
		bundleEntry(app.c.MarblePhysicsMixin, {
			bounce: sceneConfig.marble.physics.defaults.bounce
		}),
		bundleEntry(app.c.TrajectorySourceTag, {}),
		bundleEntry(app.c.MeshMixin, { type: 'three', object: createMarbleObject(radius) }),
		bundleEntry(app.c.RigidBodyMixin, {
			kind: 'dynamic',
			canSleep: false,
			linearDamping: 0.04,
			angularDamping: 0.08
		}),
		bundleEntry(app.c.ColliderMixin, {
			descriptors: createMarbleColliderDescriptors(
				radius,
				sceneConfig.marble.physics.defaults.bounce
			)
		})
	);
}

export interface TCreateMarbleBundleOptions {
	position?: TVec3;
	rotation?: TVec3;
	scale?: TVec3;
	radius?: number;
}

export function createMarbleObject(radius: number): THREE.Object3D {
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
