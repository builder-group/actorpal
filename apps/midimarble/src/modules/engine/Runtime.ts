import {
	createApp,
	createDefaultPlugin,
	type TApp,
	type TAppContext,
	type TDefaultPlugin
} from 'ecsify';
import {
	createCorePlugin,
	createSceneEditorPlugin,
	createPhysicsPlugin,
	replaceLiveWorld,
	createRenderPlugin,
	restoreWorldAtStep,
	createScenePlugin,
	syncPreloadWorldToStep,
	createTimelinePlugin,
	createTrajectoryPlugin,
	type TCorePlugin,
	type TSceneEditorPlugin,
	type TPhysicsPlugin,
	type TRenderPlugin,
	type TScenePlugin,
	type TTimelinePlugin,
	type TTrajectoryPlugin
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
				createPhysicsPlugin(),
				createRenderPlugin(),
				createScenePlugin(),
				createSceneEditorPlugin(),
				createTimelinePlugin(),
				createTrajectoryPlugin()
			] as const,
			systemSets: ['First', 'Update', 'Last']
		});
	}

	public get app(): TRuntimeApp {
		return this._app;
	}

	public run(): void {
		const app = this._app;
		if (app.r.sceneEditRebuild.active) {
			app.updateResource('sceneEditRebuild', {
				...app.r.sceneEditRebuild,
				resumeWhenReady: true
			});
			return;
		}

		app.updateResource('simulationTransport', {
			...app.r.simulationTransport,
			mode: 'running'
		});
	}

	public pause(): void {
		if (this._app.r.sceneEditRebuild.active) {
			this._app.updateResource('sceneEditRebuild', {
				...this._app.r.sceneEditRebuild,
				resumeWhenReady: false
			});
		}
		this._app.updateResource('simulationTransport', {
			...this._app.r.simulationTransport,
			mode: 'paused'
		});
	}

	public reset(): void {
		const app = this._app;
		if (app.r.sceneEditRebuild.active) {
			app.updateResource('sceneEditRebuild', {
				...app.r.sceneEditRebuild,
				resumeWhenReady: false
			});
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
		if (app.r.sceneEditRebuild.active) {
			app.updateResource('sceneEditRebuild', {
				...app.r.sceneEditRebuild,
				resumeWhenReady: false
			});
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
		this._app.r.sceneEditRebuild.world?.free();
		this._app.disposeSceneEditor();
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

export type TRuntimeApp = TApp<
	TAppContext<
		[
			TDefaultPlugin,
			TCorePlugin,
			TPhysicsPlugin,
			TRenderPlugin,
			TScenePlugin,
			TSceneEditorPlugin,
			TTimelinePlugin,
			TTrajectoryPlugin
		]
	>
>;
