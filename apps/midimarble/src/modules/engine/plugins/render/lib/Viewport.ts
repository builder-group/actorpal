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
		this._scene.background = new THREE.Color('#e7ddd2');
		this._scene.fog = new THREE.Fog('#e7ddd2', 10, 22);

		this._camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
		this._camera.position.set(0, 1.4, 8.5);

		this._renderer = new THREE.WebGLRenderer({
			antialias: true,
			powerPreference: 'high-performance'
		});
		this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this._renderer.setSize(1, 1);
		this._renderer.outputColorSpace = THREE.SRGBColorSpace;
		this._renderer.shadowMap.enabled = true;
		this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this._controls = new OrbitControls(this._camera, this._renderer.domElement);
		this._controls.enableDamping = true;
		this._controls.target.set(0, 0.5, 0);
		this._controls.minDistance = 4;
		this._controls.maxDistance = 18;
		this._controls.maxPolarAngle = Math.PI * 0.48;

		const ambient = new THREE.HemisphereLight('#fff8f2', '#c8b8a6', 1.2);
		const keyLight = new THREE.DirectionalLight('#fff4db', 2.8);
		keyLight.position.set(5, 8, 6);
		keyLight.castShadow = true;
		keyLight.shadow.mapSize.set(2048, 2048);
		keyLight.shadow.camera.near = 0.5;
		keyLight.shadow.camera.far = 30;
		keyLight.shadow.camera.left = -8;
		keyLight.shadow.camera.right = 8;
		keyLight.shadow.camera.top = 12;
		keyLight.shadow.camera.bottom = -12;

		const fillLight = new THREE.DirectionalLight('#f4c47d', 0.8);
		fillLight.position.set(-4, 3, 8);

		const floor = new THREE.Mesh(
			new THREE.CircleGeometry(10, 64),
			new THREE.ShadowMaterial({ color: '#6f5d4e', opacity: 0.12 })
		);
		floor.rotation.x = -Math.PI / 2;
		floor.position.set(0, -4.2, 0.2);
		floor.receiveShadow = true;

		this._scene.add(ambient, keyLight, fillLight, floor);
		this._trackedObjects.add(floor);
	}

	public get scene(): THREE.Scene {
		return this._scene;
	}

	public get textureLoader(): THREE.TextureLoader {
		return this._textureLoader;
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
