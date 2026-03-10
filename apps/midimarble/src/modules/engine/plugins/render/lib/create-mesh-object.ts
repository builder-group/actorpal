import * as THREE from 'three';
import type { TRenderApp } from '../types';

export function createMeshObject(ref: string, app: TRenderApp): THREE.Object3D | null {
	switch (ref) {
		case 'marble':
			return createMarbleMesh();
		case 'pegboard':
			return createPegboardMesh(app);
		default:
			return null;
	}
}

function createMarbleMesh(): THREE.Object3D {
	const mesh = new THREE.Mesh(
		new THREE.SphereGeometry(1, 32, 32),
		new THREE.MeshStandardMaterial({
			color: '#c6525b',
			roughness: 0.24,
			metalness: 0.08
		})
	);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	return mesh;
}

function createPegboardMesh(app: TRenderApp): THREE.Object3D {
	const normalMap = app.r.viewport.textureLoader.load('/textures/pegboard-normals.jpg');
	normalMap.wrapS = THREE.RepeatWrapping;
	normalMap.wrapT = THREE.RepeatWrapping;
	normalMap.repeat.set(5, 10);

	const board = new THREE.Mesh(
		new THREE.PlaneGeometry(100, 200),
		new THREE.MeshStandardMaterial({
			color: '#fff8f1',
			dithering: true,
			normalMap,
			bumpMap: normalMap
		})
	);
	board.receiveShadow = true;
	return board;
}
