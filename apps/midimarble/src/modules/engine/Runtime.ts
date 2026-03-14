import {
	createApp,
	createDefaultPlugin,
	type TApp,
	type TAppContext,
	type TDefaultPlugin
} from 'ecsify';
import {
	createCorePlugin,
	createPhysicsPlugin,
	createRenderPlugin,
	createScenePlugin,
	createTrajectoryPlugin,
	replaceLiveWorld,
	restoreWorldAtStep,
	syncPreloadWorldToStep,
	type TCorePlugin,
	type TPhysicsPlugin,
	type TRenderPlugin,
	type TScenePlugin,
	type TTrajectoryPlugin
} from './plugins';
import { ENGINE_SYSTEM_SETS } from './types';

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
				createPhysicsPlugin(),
				createRenderPlugin(),
				createTrajectoryPlugin(),
				createScenePlugin()
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});
	}

	public get app(): TRuntimeApp {
		return this._app;
	}

	public run(): void {
		const app = this._app;
		if (updateSimulationResumeWhenReady(app, true)) {
			return;
		}

		app.updateResource('simulationTransport', {
			...app.r.simulationTransport,
			mode: 'running'
		});
	}

	public pause(): void {
		updateSimulationResumeWhenReady(this._app, false);
		this._app.updateResource('simulationTransport', {
			...this._app.r.simulationTransport,
			mode: 'paused'
		});
	}

	public reset(): void {
		const app = this._app;
		if (updateSimulationResumeWhenReady(app, false)) {
			return;
		}
		const restoredWorld = restoreWorldAtStep(app, 0);
		if (restoredWorld == null) {
			return;
		}

		replaceLiveWorld(app, restoredWorld);
		app.r.accumulatorSeconds = 0;
		clearTransientSimulationState(app);
		app.updateResource('simulationTransport', {
			...app.r.simulationTransport,
			mode: 'paused',
			playheadStep: 0
		});
		syncPreloadWorldToStep(app, app.r.simulationTransport.bufferedStep);
	}

	public seekToStep(step: number): void {
		const app = this._app;
		if (updateSimulationResumeWhenReady(app, false)) {
			return;
		}
		const targetStep = Math.max(0, Math.min(step, app.r.simulationTransport.bufferedStep));
		const restoredWorld = restoreWorldAtStep(app, targetStep);
		if (restoredWorld == null) {
			return;
		}

		replaceLiveWorld(app, restoredWorld);
		app.r.accumulatorSeconds = 0;
		clearTransientSimulationState(app);
		app.updateResource('simulationTransport', {
			...app.r.simulationTransport,
			playheadStep: targetStep
		});
		syncPreloadWorldToStep(app, app.r.simulationTransport.bufferedStep);
	}

	public seekToSeconds(seconds: number): void {
		const targetStep = Math.round(seconds / this._app.r.fixedTimeStepSeconds);
		this.seekToStep(targetStep);
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
		this._app.r.preloadWorld?.free();
		this._app.r.world?.free();
		if (this._app.r.simulationSync.mode === 'rebuilding') {
			this._app.r.simulationSync.world.free();
		}
		this._app.disposeScene();
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

function clearTransientSimulationState(app: TRuntimeApp): void {
	app.r.trajectoryLines.pastLine.geometry.setDrawRange(0, 0);
	app.r.trajectoryLines.futureLine.geometry.setDrawRange(0, 0);
}

function updateSimulationResumeWhenReady(app: TRuntimeApp, resumeWhenReady: boolean): boolean {
	if (app.r.simulationSync.mode === 'idle') {
		return false;
	}

	app.updateResource('simulationSync', {
		...app.r.simulationSync,
		resumeWhenReady
	});
	return true;
}

export type TRuntimeApp = TApp<
	TAppContext<
		[TDefaultPlugin, TCorePlugin, TPhysicsPlugin, TRenderPlugin, TTrajectoryPlugin, TScenePlugin]
	>
>;
