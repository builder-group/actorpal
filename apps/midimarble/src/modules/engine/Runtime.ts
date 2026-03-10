import {
	createApp,
	createDefaultPlugin,
	type TApp,
	type TAppContext,
	type TDefaultPlugin
} from 'ecsify';
import {
	createCorePlugin,
	createRenderPlugin,
	createScenePlugin,
	type TCorePlugin,
	type TRenderPlugin,
	type TScenePlugin
} from './plugins';

export class Runtime {
	private readonly _app: TRuntimeApp;
	private _frameId: number | null = null;
	private _lastTime = 0;
	private _isMounted = true;

	constructor() {
		this._app = createApp({
			plugins: [
				createDefaultPlugin(),
				createCorePlugin(),
				createRenderPlugin(),
				createScenePlugin()
			] as const,
			systemSets: ['First', 'Update', 'Last']
		});
	}

	public get app(): TRuntimeApp {
		return this._app;
	}

	public start(): void {
		if (!this._isMounted || this._frameId != null) {
			return;
		}
		this._lastTime = performance.now();
		this._frameId = window.requestAnimationFrame(this._loop);
	}

	public stop(): void {
		if (this._frameId == null) {
			return;
		}
		window.cancelAnimationFrame(this._frameId);
		this._frameId = null;
	}

	public setContainer(container: HTMLDivElement | null): void {
		this._app.setRenderContainer(container);
		if (container == null) {
			this.stop();
			return;
		}
		this.start();
	}

	public unmount(): void {
		if (!this._isMounted) {
			return;
		}
		this._isMounted = false;
		this.stop();
		this._app.setRenderContainer(null);
		this._app.disposeRender();
		this._app.flush();
	}

	private readonly _loop = (time: number): void => {
		if (!this._isMounted) {
			return;
		}
		const dt = Math.max(0, (time - this._lastTime) / 1000);
		this._lastTime = time;
		this._app.update(dt);
		this._frameId = window.requestAnimationFrame(this._loop);
	};
}

export type TRuntimeApp = TApp<
	TAppContext<[TDefaultPlugin, TCorePlugin, TRenderPlugin, TScenePlugin]>
>;
