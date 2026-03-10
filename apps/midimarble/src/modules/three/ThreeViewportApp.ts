import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class ThreeViewportApp {
	private readonly container: HTMLDivElement;
	private readonly scene: THREE.Scene;
	private readonly camera: THREE.PerspectiveCamera;
	private readonly renderer: THREE.WebGLRenderer;
	private readonly controls: OrbitControls;
	private readonly square: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
	private readonly resizeObserver: ResizeObserver;

	constructor(container: HTMLDivElement) {
		this.container = container;
		this.scene = new THREE.Scene();

		const { width, height } = this.getContainerSize();
		this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
		this.camera.position.set(0, 0, 4);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(width, height);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.container.appendChild(this.renderer.domElement);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;

		const ambient = new THREE.AmbientLight(0xffffff, 0.8);
		const directional = new THREE.DirectionalLight(0xffffff, 1.1);
		directional.position.set(2, 3, 3);
		this.scene.add(ambient, directional);

		const squareGeometry = new THREE.PlaneGeometry(1.5, 1.5);
		const squareMaterial = new THREE.MeshStandardMaterial({ color: '#3b82f6' });
		this.square = new THREE.Mesh(squareGeometry, squareMaterial);
		this.scene.add(this.square);

		const grid = new THREE.GridHelper(10, 10, '#3f3f46', '#27272a');
		grid.position.y = -1.25;
		this.scene.add(grid);

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.container);

		this.renderer.setAnimationLoop(this.render);
	}

	private readonly render = (timeMs: number) => {
		const t = timeMs * 0.001;
		this.square.rotation.x = t * 0.6;
		this.square.rotation.y = t * 0.9;
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	};

	private getContainerSize() {
		const width = Math.max(1, this.container.clientWidth);
		const height = Math.max(1, this.container.clientHeight);
		return { width, height };
	}

	private resize() {
		const { width, height } = this.getContainerSize();
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	dispose() {
		this.renderer.setAnimationLoop(null);
		this.resizeObserver.disconnect();
		this.controls.dispose();
		this.square.geometry.dispose();
		this.square.material.dispose();
		this.renderer.dispose();

		if (this.renderer.domElement.parentNode === this.container) {
			this.container.removeChild(this.renderer.domElement);
		}
	}
}
