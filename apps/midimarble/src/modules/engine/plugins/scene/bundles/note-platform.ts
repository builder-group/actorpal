import { bundleEntry, defineBundle } from 'ecsify';
import * as THREE from 'three';
import type { TPhysicsColliderDescriptor } from '../../physics';
import {
	getDefaultNotePlatformColor,
	resolveNotePlatformTransform,
	NOTE_PLATFORM_DEFAULTS
} from '../lib/note-platform';
import type {
	TCNoteBindingMixin,
	TCNotePlatformMixin,
	TSceneApp
} from '../types';
import type { TSceneBundle } from './types';

export function createNotePlatformBundle(
	app: TSceneApp,
	noteId: number,
	anchorPosition: { x: number; y: number; z: number },
	options: Partial<TCNotePlatformMixin> = {}
): TSceneBundle {
	const platform = {
		...NOTE_PLATFORM_DEFAULTS,
		color: getDefaultNotePlatformColor(noteId),
		...options
	} satisfies TCNotePlatformMixin;
	const binding = {
		noteId
	} satisfies TCNoteBindingMixin;
	const transform = resolveNotePlatformTransform(
		anchorPosition,
		platform.rotationX,
		platform.thickness
	);

	return defineBundle(
		bundleEntry(app.c.PositionMixin, transform.position),
		bundleEntry(app.c.RotationMixin, transform.rotation),
		bundleEntry(app.c.ScaleMixin, { x: 1, y: 1, z: 1 }),
		bundleEntry(app.c.NoteBindingMixin, binding),
		bundleEntry(app.c.NotePlatformMixin, platform),
		bundleEntry(app.c.MeshMixin, {
			type: 'three',
			object: createNotePlatformObject(platform)
		}),
		bundleEntry(app.c.RigidBodyMixin, { kind: 'fixed' }),
		bundleEntry(app.c.ColliderMixin, {
			descriptors: createNotePlatformColliders(platform)
		})
	);
}

export function createNotePlatformObject(platform: Pick<TCNotePlatformMixin, 'length' | 'width' | 'thickness' | 'color'>): THREE.Object3D {
	const mesh = new THREE.Mesh(
		createNotePlatformGeometry(platform),
		new THREE.MeshStandardMaterial({
			color: platform.color,
			roughness: 0.74,
			metalness: 0.04
		})
	);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

export function createNotePlatformGeometry(
	platform: Pick<TCNotePlatformMixin, 'length' | 'width' | 'thickness'>
): THREE.ExtrudeGeometry {
	const shape = new THREE.Shape();
	shape.moveTo(0, 0);
	shape.lineTo(0, platform.thickness);
	shape.lineTo(platform.width, platform.thickness);
	shape.lineTo(platform.width, 0);
	shape.lineTo(0, 0);

	const geometry = new THREE.ExtrudeGeometry(shape, {
		steps: 1,
		depth: platform.length,
		bevelEnabled: true,
		bevelThickness: 0,
		bevelSize: 0
	});

	geometry.translate(-platform.width / 2, -platform.thickness / 2, -platform.length / 2);
	geometry.computeVertexNormals();
	return geometry;
}

export function createNotePlatformColliders(
	platform: Pick<TCNotePlatformMixin, 'length' | 'width' | 'thickness' | 'bounce'>
): TPhysicsColliderDescriptor[] {
	return [
		{
			shape: 'cuboid',
			halfExtents: {
				x: platform.width / 2,
				y: platform.thickness / 2,
				z: platform.length / 2
			},
			friction: 0.55,
			restitution: platform.bounce
		}
	];
}
