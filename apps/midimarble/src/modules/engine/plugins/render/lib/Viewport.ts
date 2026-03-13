import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Viewport {
	private _container: HTMLDivElement | null = null;
	private readonly _scene: THREE.Scene;
	private readonly _camera: THREE.PerspectiveCamera;
	private readonly _renderer: THREE.WebGLRenderer;
	private readonly _controls: OrbitControls;
	private _resizeObserver: ResizeObserver | null = null;
	private readonly _trackedObjects = new Set<THREE.Object3D>();
	private readonly _textureLoader = new THREE.TextureLoader();

	constructor() {
		this._scene = new THREE.Scene();
		this._scene.background = new THREE.Color(0xe1dbd5);

		this._camera = new THREE.PerspectiveCamera(25, 1, 0.1, 1000);
		this._camera.position.set(100, 0, 0);
		this._camera.lookAt(0, 0, 0);

		this._renderer = new THREE.WebGLRenderer({
			antialias: true,
			powerPreference: 'high-performance'
		});
		this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this._renderer.setSize(1, 1);
		this._renderer.setClearColor(0xe1dbd5);
		this._renderer.outputColorSpace = THREE.SRGBColorSpace;
		this._renderer.shadowMap.enabled = true;
		this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this._controls = new OrbitControls(this._camera, this._renderer.domElement);
		this._controls.enableDamping = true;
		this._controls.target.set(0, 0, 0);
		this._controls.minDistance = 10;
		this._controls.maxDistance = 100;
		this._controls.maxAzimuthAngle = Math.PI - 0.1;
		this._controls.minAzimuthAngle = 0.1;
		this._controls.minPolarAngle = 0.1;
		this._controls.maxPolarAngle = Math.PI - 0.1;
		this._controls.update();

		const ambient = new THREE.AmbientLight(0xffffff, 1);
		const keyLight = new THREE.DirectionalLight(0xffffff, 2);
		keyLight.position.set(100, 50, 50);
		keyLight.castShadow = true;
		keyLight.shadow.mapSize.set(4096, 4096);
		keyLight.shadow.camera.left = -50;
		keyLight.shadow.camera.right = 50;
		keyLight.shadow.camera.top = 50;
		keyLight.shadow.camera.bottom = -50;
		keyLight.shadow.radius = 3;
		keyLight.shadow.intensity = 0.6;

		const fillLight = new THREE.DirectionalLight('#3333ca', 0.5);
		fillLight.position.set(0.2, -1, 0.05);

		this._scene.add(ambient, keyLight, fillLight);
	}

	public get scene(): THREE.Scene {
		return this._scene;
	}

	public get camera(): THREE.PerspectiveCamera {
		return this._camera;
	}

	public get domElement(): HTMLCanvasElement {
		return this._renderer.domElement;
	}

	public get textureLoader(): THREE.TextureLoader {
		return this._textureLoader;
	}

	public get controlsEnabled(): boolean {
		return this._controls.enabled;
	}

	public setControlsEnabled(enabled: boolean): void {
		this._controls.enabled = enabled;
	}

	public setContainer(container: HTMLDivElement | null): void {
		if (this._container === container) {
			return;
		}

		this.detachContainer();
		this._container = container;

		if (container == null) {
			return;
		}

		container.appendChild(this._renderer.domElement);
		this._resizeObserver = new ResizeObserver(() => this.resize());
		this._resizeObserver.observe(container);
		this.resize();
	}

	public renderFrame(): void {
		if (this._container == null) {
			return;
		}

		this._controls.update();
		this._renderer.render(this._scene, this._camera);
	}

	public trackObject(object: THREE.Object3D): void {
		this._trackedObjects.add(object);
	}

	public disposeObject(object: THREE.Object3D | null): void {
		if (object == null) {
			return;
		}

		this._scene.remove(object);
		this._trackedObjects.delete(object);
		object.traverse((child) => {
			const mesh = child as THREE.Mesh;
			if (mesh.geometry != null) {
				mesh.geometry.dispose();
			}

			const material = mesh.material;
			if (Array.isArray(material)) {
				for (const entry of material) {
					entry.dispose();
				}
			} else if (material != null) {
				material.dispose();
			}
		});
	}

	public dispose(): void {
		this.detachContainer();
		this._controls.dispose();

		for (const object of Array.from(this._trackedObjects)) {
			this.disposeObject(object);
		}

		this._renderer.dispose();
	}

	private detachContainer(): void {
		this._resizeObserver?.disconnect();
		this._resizeObserver = null;

		const parent = this._renderer.domElement.parentNode;
		if (parent instanceof HTMLElement) {
			parent.removeChild(this._renderer.domElement);
		}
	}

	private resize(): void {
		const width = Math.max(1, this._container?.clientWidth ?? 1);
		const height = Math.max(1, this._container?.clientHeight ?? 1);
		this._camera.aspect = width / height;
		this._camera.updateProjectionMatrix();
		this._renderer.setSize(width, height);
	}
}
