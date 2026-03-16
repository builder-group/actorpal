import {
	createApp,
	createDefaultPlugin,
	Entity,
	With,
	type TApp,
	type TAppContext,
	type TDefaultPlugin
} from 'ecsify';
import type {
	TMarbleSnapshot,
	TNotePlatformSnapshot,
	TProjectRecord,
	TStraightTrackSnapshot
} from '@/modules/persistence/types';
import {
	createAudioPlugin,
	createCorePlugin,
	createMidiPlugin,
	createPhysicsPlugin,
	createRenderPlugin,
	createScenePlugin,
	createTrajectoryPlugin,
	createTransportPlugin,
	type TAudioInstrumentId,
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
import { sceneConfig } from './plugins/scene/config';
import { ENGINE_SYSTEM_SETS } from './types';

export class Runtime {
	private readonly _app: TRuntimeApp;
	private _frameId: number | null = null;
	private _lastTime = 0;
	private _isMounted = true;

	constructor(record?: TProjectRecord | null) {
		this._app = createApp({
			plugins: [
				createDefaultPlugin(),
				createCorePlugin(),
				createMidiPlugin(
					record != null
						? { song: record.midiSong, selectedTrackId: record.selectedTrackId }
						: undefined
				),
				createTransportPlugin(),
				createAudioPlugin(record != null ? { audioSettings: record.audioSettings } : undefined),
				createPhysicsPlugin(),
				createRenderPlugin(),
				createTrajectoryPlugin(
					record != null ? { trajectoryConfig: record.trajectoryConfig } : undefined
				),
				createScenePlugin(
					record != null
						? {
								marble: record.marble,
								straightTracks: record.straightTracks,
								notePlatforms: record.notePlatforms
							}
						: undefined
				)
			] as const,
			systemSets: [...ENGINE_SYSTEM_SETS]
		});

		if (record != null) {
			this._app.seekToTick(record.playheadTick);
		}
	}

	public get app(): TRuntimeApp {
		return this._app;
	}

	public run(): void {
		const app = this._app;
		void app.resumeAudio();
		if (app.setSimulationResumeWhenReady(true)) {
			return;
		}

		app.run();
	}

	public pause(): void {
		this._app.setSimulationResumeWhenReady(false);
		this._runImmediateCommand(() => {
			this._app.pause();
		});
	}

	public reset(): void {
		this._runSimulationCommand(undefined, () => {
			this._app.resetTransport();
		});
	}

	public async loadMidiFile(file: File): Promise<void> {
		await this._app.loadMidiFile(file);
		this._runImmediateCommand(() => {
			this._app.clearTrackInstruments();
			this._app.resetTransport();
			this._app.setSceneEditPending(false);
		});
	}

	public clearMidiSong(): void {
		this._runImmediateCommand(() => {
			this._app.clearMidiSong();
			this._app.clearTrackInstruments();
			this._app.resetTransport();
			this._app.setSceneEditPending(false);
		});
	}

	public setPreviewEnabled(enabled: boolean): void {
		this._runImmediateCommand(() => {
			this._app.setPreviewEnabled(enabled);
		});
	}

	public togglePreview(): void {
		this._runImmediateCommand(() => {
			this._app.togglePreview();
		});
	}

	public updatePreviewConfig(patch: Partial<TRuntimeApp['r']['previewConfig']>): void {
		this._runImmediateCommand(() => {
			this._app.updatePreviewConfig(patch);
		});
	}

	public updateTrajectoryConfig(patch: Partial<TRuntimeApp['r']['trajectoryConfig']>): void {
		this._runImmediateCommand(() => {
			this._app.updateTrajectoryConfig(patch);
		});
	}

	public updateAudioSettings(patch: Partial<TRuntimeApp['r']['audioSettings']>): void {
		this._runImmediateCommand(() => {
			this._app.updateAudioSettings(patch);
		});
	}

	public setSelectedTrack(trackId: number): void {
		this._runImmediateCommand(() => {
			this._app.updateResource('selectedTrackId', trackId);
			this._app.clearNoteSelection();
		});
	}

	public setTrackInstrument(trackId: number, instrumentId: TAudioInstrumentId): void {
		this._runImmediateCommand(() => {
			this._app.setTrackInstrument(trackId, instrumentId);
		});
		if (this._app.r.selectedTrackId === trackId) {
			void this._app.previewTrackInstrument(trackId);
		}
	}

	public selectNote(noteId: number, tick: number): void {
		const didSelect = this._runTransportEditCommand(false, () => {
			this._app.seekToTick(tick);
			this._app.selectNote(noteId);
			return true;
		});
		if (didSelect) {
			void this._app.previewNote(noteId);
		}
	}

	public selectNotes(noteIds: number[], primaryNoteId: number | null): void {
		this._runImmediateCommand(() => {
			this._app.selectNotes(noteIds, primaryNoteId);
		});
	}

	public selectAllTrackNotes(trackId?: number): void {
		this._runImmediateCommand(() => {
			this._app.selectAllTrackNotes(trackId);
		});
	}

	public clearNoteSelection(): void {
		this._runImmediateCommand(() => {
			this._app.clearNoteSelection();
		});
	}

	public previewNotesAtTick(tick: number): void {
		void this._app.previewNotesAtTick(tick);
	}

	public previewNote(noteId: number): void {
		void this._app.previewNote(noteId);
	}

	public previewMidiNote(noteNumber: number): void {
		void this._app.previewMidiNote(noteNumber);
	}

	public createNote(input: TMidiCreateNoteInput): number | null {
		return this._runTransportEditCommand(null, () => this._app.createNote(input));
	}

	public moveSelectedNotes(deltaTick: number, deltaNoteNumber: number): boolean {
		return this._runTransportEditCommand(false, () =>
			this._app.moveSelectedNotes(deltaTick, deltaNoteNumber)
		);
	}

	public resizePrimarySelectedNote(edge: 'start' | 'end', deltaTick: number): boolean {
		return this._runTransportEditCommand(false, () =>
			this._app.resizePrimarySelectedNote(edge, deltaTick)
		);
	}

	public deleteSelectedNotes(): number {
		return this._runTransportEditCommand(0, () => this._app.deleteSelectedNotes());
	}

	public createOrSelectNotePlatform(noteId: number): number | null {
		return this._runSimulationCommand(null, () => this._app.createOrSelectNotePlatform(noteId));
	}

	public createStraightTrack(): number | null {
		return this._runSimulationCommand(null, () => this._app.createStraightTrack());
	}

	public deleteStraightTrack(entityId: number): void {
		void this._runSimulationCommand(false, () => this._app.deleteStraightTrack(entityId));
	}

	public deleteNotePlatform(entityId: number): void {
		void this._runSimulationCommand(false, () => this._app.deleteNotePlatform(entityId));
	}

	public updateNotePlatform(
		entityId: number,
		patch: Partial<TRuntimeApp['c']['NotePlatformMixin'][number]>
	): void {
		this._runDeferredSceneEdit(() => this._app.updateNotePlatform(entityId, patch));
	}

	public updateMarblePhysics(
		entityId: number,
		patch: Partial<TRuntimeApp['c']['MarblePhysicsMixin'][number]>
	): void {
		this._runDeferredSceneEdit(() => this._app.updateMarblePhysics(entityId, patch));
	}

	public commitSceneEdit(): void {
		if (!this._app.r.sceneEditState.pending) {
			return;
		}

		this._runImmediateCommand(() => {
			this._app.markSimulationDirty();
			this._app.requestSimulationSync();
			this._app.setSceneEditPending(false);
		});
	}

	public extractSnapshot(): TProjectRecord {
		const app = this._app;

		// Marble
		let marble: TMarbleSnapshot = {
			position: { ...sceneConfig.marble.spawn.position },
			rotation: { ...sceneConfig.marble.spawn.rotation },
			bounce: sceneConfig.marble.physics.defaults.bounce
		};
		for (const [, , , marblePhysics] of app.queryComponents(
			[Entity, app.c.PositionMixin, app.c.RotationMixin, app.c.MarblePhysicsMixin] as const,
			With(app.c.MarbleTag)
		)) {
			marble = {
				position: { ...sceneConfig.marble.spawn.position },
				rotation: { ...sceneConfig.marble.spawn.rotation },
				bounce: marblePhysics.bounce
			};
			break;
		}

		// Note platforms
		const notePlatforms: TNotePlatformSnapshot[] = [];
		for (const [, binding, platform] of app.queryComponents(
			[Entity, app.c.NoteBindingMixin, app.c.NotePlatformMixin] as const,
			With(app.c.NotePlatformMixin)
		)) {
			notePlatforms.push({
				noteId: binding.noteId,
				offsetY: platform.offsetY,
				offsetZ: platform.offsetZ,
				rotationX: platform.rotationX,
				length: platform.length,
				width: platform.width,
				thickness: platform.thickness,
				bounce: platform.bounce,
				color: platform.color
			});
		}

		// Straight tracks
		const straightTracks: TStraightTrackSnapshot[] = [];
		for (const [, transform, track, linear] of app.queryComponents(
			[
				Entity,
				app.c.AuthoredTransformMixin,
				app.c.StraightTrackMixin,
				app.c.LinearElementMixin
			] as const,
			With(app.c.StraightTrackMixin)
		)) {
			straightTracks.push({
				position: { ...transform.position },
				rotation: { ...transform.rotation },
				scale: { ...transform.scale },
				length: linear.length,
				height: track.height,
				width: track.width,
				channelWidth: track.channelWidth,
				channelDepth: track.channelDepth,
				color: track.color
			});
		}

		const { midiSong, selectedTrackId, transport, audioSettings, trajectoryConfig } = app.r;

		return {
			id: '',
			name: midiSong?.name ?? 'Untitled',
			createdAt: 0,
			updatedAt: Date.now(),
			midiFileName: midiSong?.name ?? null,
			midiSong: midiSong ?? null,
			selectedTrackId,
			playheadTick: transport.playheadTick,
			audioSettings: { ...audioSettings },
			trajectoryConfig: { ...trajectoryConfig },
			marble,
			notePlatforms,
			straightTracks
		};
	}

	public seekToTick(tick: number): void {
		this._runSimulationCommand(undefined, () => {
			this._app.seekToTick(tick);
		});
	}

	public stepBackwardTick(): void {
		if (this._app.setSimulationResumeWhenReady(false)) {
			return;
		}

		const wasPaused = this._app.r.transport.mode === 'paused';
		const prevTick = this._app.r.transport.playheadTick;
		this._runImmediateCommand(() => {
			this._app.stepBackwardTick();
		});
		if (wasPaused && this._app.r.transport.playheadTick !== prevTick) {
			void this._app.previewNotesAtTick(this._app.r.transport.playheadTick);
		}
	}

	public stepForwardTick(): void {
		if (this._app.setSimulationResumeWhenReady(false)) {
			return;
		}

		const wasPaused = this._app.r.transport.mode === 'paused';
		const prevTick = this._app.r.transport.playheadTick;
		this._runImmediateCommand(() => {
			this._app.stepForwardTick();
		});
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

	private _runImmediateCommand<T>(command: () => T): T {
		const result = command();
		this._flushImmediateUpdate();
		return result;
	}

	private _runSimulationCommand<T>(fallback: T, command: () => T): T {
		if (this._app.setSimulationResumeWhenReady(false)) {
			return fallback;
		}

		return this._runImmediateCommand(command);
	}

	private _runTransportEditCommand<T>(fallback: T, command: () => T): T {
		if (this._app.setSimulationResumeWhenReady(false)) {
			return fallback;
		}

		this._app.pause();
		return this._runImmediateCommand(command);
	}

	private _runDeferredSceneEdit(command: () => boolean): void {
		if (!command()) {
			return;
		}

		this._runImmediateCommand(() => {
			this._app.setSceneEditPending(true);
		});
	}
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
