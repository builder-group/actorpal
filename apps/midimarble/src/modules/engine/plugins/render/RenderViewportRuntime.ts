import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class RenderViewportRuntime {
	private container: HTMLDivElement | null = null;
	private readonly scene: THREE.Scene;
	private readonly camera: THREE.PerspectiveCamera;
	private readonly renderer: THREE.WebGLRenderer;
	private readonly controls: OrbitControls;
	private resizeObserver: ResizeObserver | null = null;
	private readonly trackedMeshes: THREE.Mesh[] = [];

	constructor() {
		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
		this.camera.position.set(0, 0.6, 3.5);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(1, 1);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;

		const ambient = new THREE.AmbientLight(0xffffff, 0.8);
		const directional = new THREE.DirectionalLight(0xffffff, 1.1);
		directional.position.set(2, 3, 3);
		this.scene.add(ambient, directional);

		const grid = new THREE.GridHelper(10, 10, '#3f3f46', '#27272a');
		grid.position.y = -1;
		this.scene.add(grid);
	}

	public createCube() {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const material = new THREE.MeshStandardMaterial({ color: '#3b82f6' });
		const cube = new THREE.Mesh(geometry, material);
		this.scene.add(cube);
		this.trackedMeshes.push(cube);
		return cube;
	}

	public setContainer(container: HTMLDivElement | null): void {
		if (this.container === container) {
			return;
		}

		this.detachContainer();
		this.container = container;

		if (container == null) {
			return;
		}

		container.appendChild(this.renderer.domElement);
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(container);
		this.resize();
	}

	public renderFrame() {
		if (this.container == null) {
			return;
		}
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	}

	public dispose() {
		this.detachContainer();
		this.controls.dispose();

		for (const mesh of this.trackedMeshes) {
			mesh.geometry.dispose();
			if (Array.isArray(mesh.material)) {
				for (const material of mesh.material) {
					material.dispose();
				}
			} else {
				mesh.material.dispose();
			}
		}

		this.renderer.dispose();
	}

	private getContainerSize() {
		if (this.container == null) {
			return { width: 1, height: 1 };
		}
		const width = Math.max(1, this.container.clientWidth);
		const height = Math.max(1, this.container.clientHeight);
		return { width, height };
	}

	private detachContainer() {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;

		const parent = this.renderer.domElement.parentNode;
		if (parent instanceof HTMLElement) {
			parent.removeChild(this.renderer.domElement);
		}
	}

	private resize() {
		const { width, height } = this.getContainerSize();
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}
}
