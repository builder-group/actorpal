import {
	createApp,
	createDefaultPlugin,
	type TApp,
	type TAppContext,
	type TDefaultPlugin
} from 'ecsify';
import {
	createAudioPlugin,
	createCorePlugin,
	createMidiPlugin,
	createPhysicsPlugin,
	createRenderPlugin,
	createScenePlugin,
	createTrajectoryPlugin,
	createTransportPlugin,
	type TAudioPlugin,
	type TCorePlugin,
	type TMidiCreateNoteInput,
	type TMidiPlugin,
	type TPhysicsPlugin,
	type TRenderPlugin,
	type TScenePlugin,
	type TTrajectoryPlugin,
	type TTransportPlugin
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
				createMidiPlugin(),
				createTransportPlugin(),
				createAudioPlugin(),
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
		void app.resumeAudio();
		if (updateSimulationResumeWhenReady(app, true)) {
			return;
		}

		app.run();
	}

	public pause(): void {
		updateSimulationResumeWhenReady(this._app, false);
		this._app.pause();
		this._flushImmediateUpdate();
	}

	public reset(): void {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return;
		}
		this._app.resetTransport();
		this._flushImmediateUpdate();
	}

	public async loadMidiFile(file: File): Promise<void> {
		await this._app.loadMidiFile(file);
		this._app.resetTransport();
		this._setSceneEditPending(false);
		this._flushImmediateUpdate();
	}

	public clearMidiSong(): void {
		this._app.clearMidiSong();
		this._app.resetTransport();
		this._setSceneEditPending(false);
		this._flushImmediateUpdate();
	}

	public setPreviewEnabled(enabled: boolean): void {
		this._app.setPreviewEnabled(enabled);
		this._flushImmediateUpdate();
	}

	public togglePreview(): void {
		this._app.togglePreview();
		this._flushImmediateUpdate();
	}

	public updatePreviewConfig(patch: Partial<TRuntimeApp['r']['previewConfig']>): void {
		this._app.updatePreviewConfig(patch);
		this._flushImmediateUpdate();
	}

	public selectNote(noteId: number, tick: number): void {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return;
		}

		this._app.pause();
		this._app.seekToTick(tick);
		this._app.selectNote(noteId);
		this._flushImmediateUpdate();
		void this._app.previewNote(noteId);
	}

	public selectNotes(noteIds: number[], primaryNoteId: number | null): void {
		this._app.selectNotes(noteIds, primaryNoteId);
		this._flushImmediateUpdate();
	}

	public selectAllTrackNotes(trackId?: number): void {
		this._app.selectAllTrackNotes(trackId);
		this._flushImmediateUpdate();
	}

	public clearNoteSelection(): void {
		this._app.clearNoteSelection();
		this._flushImmediateUpdate();
	}

	public previewNotesAtTick(tick: number): void {
		void this._app.previewNotesAtTick(tick);
	}

	public previewNote(noteId: number): void {
		void this._app.previewNote(noteId);
	}

	public createNote(input: TMidiCreateNoteInput): number | null {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return null;
		}

		this._app.pause();
		const noteId = this._app.createNote(input);
		this._flushImmediateUpdate();
		return noteId;
	}

	public moveSelectedNotes(deltaTick: number, deltaNoteNumber: number): boolean {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return false;
		}

		this._app.pause();
		const didMove = this._app.moveSelectedNotes(deltaTick, deltaNoteNumber);
		this._flushImmediateUpdate();
		return didMove;
	}

	public resizePrimarySelectedNote(edge: 'start' | 'end', deltaTick: number): boolean {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return false;
		}

		this._app.pause();
		const didResize = this._app.resizePrimarySelectedNote(edge, deltaTick);
		this._flushImmediateUpdate();
		return didResize;
	}

	public deleteSelectedNotes(): number {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return 0;
		}

		this._app.pause();
		const deletedCount = this._app.deleteSelectedNotes();
		this._flushImmediateUpdate();
		return deletedCount;
	}

	public createOrSelectNotePlatform(noteId: number): number | null {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return null;
		}

		const entityId = this._app.createOrSelectNotePlatform(noteId);
		this._flushImmediateUpdate();
		return entityId;
	}

	public createStraightTrack(): number | null {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return null;
		}

		const entityId = this._app.createStraightTrack();
		if (entityId == null) {
			return null;
		}

		this._flushImmediateUpdate();
		return entityId;
	}

	public deleteStraightTrack(entityId: number): void {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return;
		}

		if (!this._app.deleteStraightTrack(entityId)) {
			return;
		}

		this._flushImmediateUpdate();
	}

	public updateNotePlatform(
		entityId: number,
		patch: Partial<TRuntimeApp['c']['NotePlatformMixin'][number]>
	): void {
		if (!this._app.updateNotePlatform(entityId, patch)) {
			return;
		}

		this._setSceneEditPending(true);
		this._flushImmediateUpdate();
	}

	public updateMarblePhysics(
		entityId: number,
		patch: Partial<TRuntimeApp['c']['MarblePhysicsMixin'][number]>
	): void {
		if (!this._app.updateMarblePhysics(entityId, patch)) {
			return;
		}

		this._setSceneEditPending(true);
		this._flushImmediateUpdate();
	}

	public commitSceneEdit(): void {
		if (!this._app.r.sceneEditState.pending) {
			return;
		}

		this._app.markSimulationDirty();
		this._app.requestSimulationSync();
		this._setSceneEditPending(false);
		this._flushImmediateUpdate();
	}

	public seekToTick(tick: number): void {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return;
		}
		this._app.seekToTick(tick);
		this._flushImmediateUpdate();
	}

	public stepBackwardTick(): void {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return;
		}

		const wasPaused = this._app.r.transport.mode === 'paused';
		const prevTick = this._app.r.transport.playheadTick;
		this._app.stepBackwardTick();
		this._flushImmediateUpdate();
		if (wasPaused && this._app.r.transport.playheadTick !== prevTick) {
			void this._app.previewNotesAtTick(this._app.r.transport.playheadTick);
		}
	}

	public stepForwardTick(): void {
		if (updateSimulationResumeWhenReady(this._app, false)) {
			return;
		}

		const wasPaused = this._app.r.transport.mode === 'paused';
		const prevTick = this._app.r.transport.playheadTick;
		this._app.stepForwardTick();
		this._flushImmediateUpdate();
		if (wasPaused && this._app.r.transport.playheadTick !== prevTick) {
			void this._app.previewNotesAtTick(this._app.r.transport.playheadTick);
		}
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
		this._app.disposeTrajectory();
		this._app.disposeAudio();
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

	private _flushImmediateUpdate(): void {
		this._app.update(0);
	}

	private _setSceneEditPending(pending: boolean): void {
		if (this._app.r.sceneEditState.pending === pending) {
			return;
		}

		this._app.updateResource('sceneEditState', {
			pending
		});
	}
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
		[
			TDefaultPlugin,
			TCorePlugin,
			TMidiPlugin,
			TTransportPlugin,
			TAudioPlugin,
			TPhysicsPlugin,
			TRenderPlugin,
			TTrajectoryPlugin,
			TScenePlugin
		]
	>
>;
