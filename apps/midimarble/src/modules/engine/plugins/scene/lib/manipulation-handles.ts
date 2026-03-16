import * as THREE from 'three';

const HANDLE_KIND_KEY = 'linearElementHandleKind';

export function createSceneManipulationHandles(
	handleRadius: number,
	handleColor: string
): { start: THREE.Mesh; end: THREE.Mesh } {
	const start = createSceneManipulationHandle(handleRadius, handleColor);
	start.userData[HANDLE_KIND_KEY] = 'start';
	start.visible = false;
	start.renderOrder = 10;

	const end = createSceneManipulationHandle(handleRadius, handleColor);
	end.userData[HANDLE_KIND_KEY] = 'end';
	end.visible = false;
	end.renderOrder = 10;

	return { start, end };
}

export function disposeSceneManipulationHandles(handles: {
	start: THREE.Mesh;
	end: THREE.Mesh;
}): void {
	for (const handle of [handles.start, handles.end]) {
		handle.parent?.remove(handle);
		handle.geometry.dispose();
		if (Array.isArray(handle.material)) {
			for (const material of handle.material) {
				material.dispose();
			}
		} else {
			handle.material.dispose();
		}
	}
}

export function getLinearElementHandleKind(object: THREE.Object3D | null): 'start' | 'end' | null {
	if (object == null) {
		return null;
	}

	const kind = object.userData[HANDLE_KIND_KEY];
	return kind === 'start' || kind === 'end' ? kind : null;
}

export function updateHandleAppearance(
	handle: THREE.Mesh,
	handleRadius: number,
	handleColor: string
): void {
	handle.geometry.dispose();
	handle.geometry = new THREE.SphereGeometry(handleRadius, 24, 16);

	if (Array.isArray(handle.material)) {
		for (const material of handle.material) {
			material.dispose();
		}
		handle.material = new THREE.MeshBasicMaterial({ color: handleColor });
		return;
	}

	handle.material.dispose();
	handle.material = new THREE.MeshBasicMaterial({ color: handleColor });
}

function createSceneManipulationHandle(handleRadius: number, handleColor: string): THREE.Mesh {
	const geometry = new THREE.SphereGeometry(handleRadius, 24, 16);
	const material = new THREE.MeshBasicMaterial({
		color: handleColor
	});

	return new THREE.Mesh(geometry, material);
}
