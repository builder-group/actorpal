import { bundleEntry, defineBundle } from 'ecsify';
import * as THREE from 'three';
import type { TPhysicsColliderDescriptor } from '../../physics';
import { sceneConfig } from '../config';
import {
	getDefaultNotePlatformColor,
	getNotePlatformGeometryKey,
	resolveNotePlatformTransform
} from '../lib/note-platform';
import {
	createTrackColliders,
	createTrackGeometry,
	getScaledTrackChannelDepth,
	getScaledTrackChannelWidth
} from '../lib/track-shape';
import type { TCNoteBindingMixin, TCNotePlatformMixin, TSceneApp } from '../types';
import type { TSceneBundle } from './types';

export function createNotePlatformBundle(
	app: TSceneApp,
	noteId: number,
	anchorPosition: { x: number; y: number; z: number },
	options: Partial<TCNotePlatformMixin> = {}
): TSceneBundle {
	const platform = {
		...sceneConfig.notePlatform.defaults,
		color: getDefaultNotePlatformColor(noteId),
		...options
	} satisfies TCNotePlatformMixin;
	const binding = {
		noteId
	} satisfies TCNoteBindingMixin;
	const transform = resolveNotePlatformTransform(
		anchorPosition,
		platform.offsetY,
		platform.offsetZ,
		platform.rotationX,
		platform.thickness,
		platform.width
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

export function createNotePlatformObject(
	platform: Pick<TCNotePlatformMixin, 'length' | 'width' | 'thickness' | 'color'>
): THREE.Object3D {
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
	const geometry = createTrackGeometry(getNotePlatformShape(platform), 'wall-only-negative');
	geometry.userData['notePlatformGeometryKey'] = getNotePlatformGeometryKey(platform);
	return geometry;
}

export function createNotePlatformColliders(
	platform: Pick<TCNotePlatformMixin, 'length' | 'width' | 'thickness' | 'bounce'>
): TPhysicsColliderDescriptor[] {
	return createTrackColliders(getNotePlatformShape(platform), 'wall-only-negative', {
		friction: 0.55,
		restitution: platform.bounce
	});
}

function getNotePlatformShape(
	platform: Pick<TCNotePlatformMixin, 'length' | 'width' | 'thickness'>
): {
	length: number;
	width: number;
	height: number;
	channelWidth: number;
	channelDepth: number;
} {
	return {
		length: platform.length,
		width: platform.width,
		height: platform.thickness,
		channelWidth: getScaledTrackChannelWidth(platform.width),
		channelDepth: getScaledTrackChannelDepth(platform.thickness)
	};
}
