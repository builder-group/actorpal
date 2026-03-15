import { FileUp, Plus, SlidersHorizontal, X } from 'lucide-react';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useResource } from '@/modules/engine';
import { EditorCxProvider, useEditorCx } from '../EditorCx';
import { canCreateStraightTrack } from '../lib/scene-ui';
import { PreviewCameraInspector } from './PreviewCameraInspector';
import { SelectionInspector } from './SelectionInspector';
import { Timeline } from './Timeline';

export const Editor: React.FC = () => {
	return (
		<EditorCxProvider>
			<InnerEditor />
		</EditorCxProvider>
	);
};

const TrajectorySection: React.FC = () => {
	const runtime = useEditorCx().runtime;
	const app = runtime.app;
	const config = useResource(app, 'trajectoryConfig');
	const update = (patch: Partial<typeof config>) => runtime.updateTrajectoryConfig(patch);

	return (
		<section>
			<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">Trajectory</h3>
			<label className="text-base-700 mt-3 flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={config.enabled}
					onChange={(e) => update({ enabled: e.target.checked })}
				/>
				Enabled
			</label>
			<div className="text-base-700 mt-3 flex gap-4 text-sm">
				<label className="flex items-center gap-2">
					Future
					<input
						type="color"
						value={config.futureColor}
						onChange={(e) => update({ futureColor: e.target.value })}
					/>
				</label>
				<label className="flex items-center gap-2">
					Past
					<input
						type="color"
						value={config.pastColor}
						onChange={(e) => update({ pastColor: e.target.value })}
					/>
				</label>
			</div>
		</section>
	);
};

const AudioSection: React.FC = () => {
	const runtime = useEditorCx().runtime;
	const app = runtime.app;
	const config = useResource(app, 'audioConfig');
	const state = useResource(app, 'audioState');
	const update = (patch: Partial<typeof config>) => runtime.updateAudioConfig(patch);

	const status = !config.enabled
		? 'Muted'
		: state.isEnabled && state.context != null
			? 'Ready'
			: 'Waiting for gesture';

	return (
		<section>
			<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">Audio</h3>
			<label className="text-base-700 mt-3 flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={config.enabled}
					onChange={(e) => update({ enabled: e.target.checked })}
				/>
				Enabled
			</label>
			<label className="text-base-700 mt-3 block text-sm">
				Volume: {Math.round(config.masterVolume * 100)}%
				<input
					type="range"
					min={0}
					max={100}
					value={Math.round(config.masterVolume * 100)}
					className="mt-1 block w-full"
					onChange={(e) => update({ masterVolume: Number(e.target.value) / 100 })}
				/>
			</label>
			<p className="text-base-500 mt-2 text-xs tracking-wide uppercase">{status}</p>
		</section>
	);
};

const InnerEditor: React.FC = () => {
	const cx = useEditorCx();
	const app = cx.runtime.app;
	const [isAddMenuOpen, setIsAddMenuOpen] = React.useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
	const [isImporting, setIsImporting] = React.useState(false);
	const midiSong = useResource(app, 'midiSong');
	const selectedTrackId = useResource(app, 'selectedTrackId');
	const midiImportError = useResource(app, 'midiImportError');
	const previewConfig = useResource(app, 'previewConfig');
	const simulationSync = useResource(app, 'simulationSync');
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const selectedTrack = React.useMemo(
		() => midiSong?.tracks.find((track) => track.id === selectedTrackId) ?? null,
		[midiSong, selectedTrackId]
	);
	const songLabel = midiSong?.name ?? 'No MIDI';
	const needsMidiStart = midiSong == null || selectedTrack == null;
	const canAddStraightTrack = React.useMemo(
		() => canCreateStraightTrack(previewConfig.enabled, simulationSync.mode),
		[previewConfig.enabled, simulationSync.mode]
	);

	const openMidiPicker = React.useCallback(() => {
		if (!isImporting) {
			fileInputRef.current?.click();
		}
	}, [isImporting]);

	const handleMidiFileChange = React.useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			event.target.value = '';
			if (file == null) {
				return;
			}

			setIsImporting(true);
			try {
				await cx.runtime.loadMidiFile(file);
			} finally {
				setIsImporting(false);
			}
		},
		[cx.runtime]
	);

	const handleCreateStraightTrack = React.useCallback(() => {
		if (!canAddStraightTrack) {
			return;
		}

		setIsAddMenuOpen(false);
		void cx.runtime.createStraightTrack();
	}, [canAddStraightTrack, cx.runtime]);

	React.useEffect(() => {
		if (!canAddStraightTrack) {
			setIsAddMenuOpen(false);
		}
	}, [canAddStraightTrack]);

	return (
		<main className="bg-base-100 h-screen overflow-hidden">
			<input
				ref={fileInputRef}
				type="file"
				accept=".mid,.midi,audio/midi,audio/x-midi"
				className="hidden"
				onChange={handleMidiFileChange}
			/>

			{needsMidiStart ? (
				<section className="from-base-100 via-base-50 to-base-100 flex h-full items-center justify-center bg-linear-to-br px-6">
					<div className="border-base-200 bg-base-0 w-full max-w-xl rounded-2xl border px-8 py-10 shadow-lg">
						<p className="text-base-500 text-xs font-semibold tracking-[0.18em] uppercase">
							Midimarble
						</p>
						<h1 className="text-base-950 mt-3 text-3xl font-semibold tracking-tight">
							Open a MIDI file to start shaping the marble path.
						</h1>
						<p className="text-base-600 mt-3 max-w-lg text-sm leading-6">
							Import a single MIDI track first. Then the timeline, note markers, and note-bound
							platform workflow become available in the scene.
						</p>

						<div className="mt-8 flex items-center gap-3">
							<button
								type="button"
								className="bg-base-900 text-base-0 hover:bg-base-800 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:opacity-60"
								disabled={isImporting}
								onClick={openMidiPicker}
							>
								<FileUp className="h-4 w-4" />
								<span>{isImporting ? 'Importing…' : 'Open MIDI'}</span>
							</button>
						</div>

						{midiImportError != null ? (
							<p className="mt-4 text-sm text-red-700">{midiImportError}</p>
						) : selectedTrack == null && midiSong != null ? (
							<p className="mt-4 text-sm text-red-700">
								The imported MIDI file does not contain a playable note track yet.
							</p>
						) : null}
					</div>
				</section>
			) : (
				<Group orientation="vertical" className="h-full">
					<Panel>
						<Group className="h-full">
							<Panel>
								<section className="border-base-300 relative h-full min-w-0 overflow-hidden border-r">
									<div ref={cx.setContainer} className="h-full w-full" />
									<div className="absolute top-3 left-3 z-10">
										<div className="flex w-fit min-w-full items-center gap-2">
											<div className="bg-base-0/90 text-base-700 inline-flex h-9 items-center rounded-md px-3 text-xs font-medium tracking-wide uppercase shadow-sm">
												{songLabel}
												{selectedTrack != null ? (
													<span className="text-base-500 ml-2">{selectedTrack.name}</span>
												) : null}
											</div>
											<div className="relative">
												<button
													type="button"
													className="focus-visible:ring-base-300 border-base-200 bg-base-0/90 text-base-600 hover:bg-base-100 disabled:border-base-200 disabled:text-base-400 pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
													disabled={!canAddStraightTrack}
													aria-expanded={isAddMenuOpen}
													aria-haspopup="menu"
													aria-label="Add scene element"
													title="Add Scene Element"
													onClick={() => {
														if (!canAddStraightTrack) {
															return;
														}

														setIsSettingsOpen(false);
														setIsAddMenuOpen((current) => !current);
													}}
												>
													<Plus className="h-4 w-4" />
												</button>

												{isAddMenuOpen ? (
													<div className="bg-base-0 border-base-200 pointer-events-auto absolute top-full left-0 mt-2 min-w-44 rounded-lg border p-1.5 shadow-xl">
														<button
															type="button"
															role="menuitem"
															className="text-base-800 hover:bg-base-100 focus-visible:ring-base-300 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:outline-none"
															onClick={handleCreateStraightTrack}
														>
															<Plus className="text-base-500 h-4 w-4" />
															<span>Straight Track</span>
														</button>
													</div>
												) : null}
											</div>
											<button
												type="button"
												className={`focus-visible:ring-base-300 pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition focus-visible:ring-2 focus-visible:outline-none ${
													isSettingsOpen
														? 'bg-base-100 text-base-900 border-base-300 hover:bg-base-200'
														: 'border-base-200 bg-base-0/90 text-base-600 hover:bg-base-100'
												}`}
												aria-pressed={isSettingsOpen}
												aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
												title={isSettingsOpen ? 'Close settings' : 'Open settings'}
												onClick={() => {
													setIsAddMenuOpen(false);
													setIsSettingsOpen((current) => !current);
												}}
											>
												<SlidersHorizontal className="h-4 w-4" />
											</button>
										</div>

										{isSettingsOpen ? (
											<div className="bg-base-0 border-base-200 pointer-events-auto mt-2 w-max max-w-[min(22rem,calc(100vw-2rem))] min-w-full rounded-lg border p-4 shadow-xl">
												<div className="mb-4 flex items-center justify-between gap-3">
													<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">
														Settings
													</h3>
													<button
														type="button"
														className="border-base-200 text-base-500 hover:bg-base-100 focus-visible:ring-base-300 inline-flex h-8 w-8 items-center justify-center rounded-md border transition focus-visible:ring-2 focus-visible:outline-none"
														aria-label="Close settings"
														onClick={() => setIsSettingsOpen(false)}
													>
														<X className="h-4 w-4" />
													</button>
												</div>

												<div className="flex flex-col gap-5">
													<TrajectorySection />
													<AudioSection />
												</div>
											</div>
										) : null}
									</div>
								</section>
							</Panel>

							<Separator className="border-base-300 w-px shrink-0 cursor-col-resize border-r" />

							<Panel defaultSize="320px" minSize="200px" maxSize="500px">
								<aside className="bg-base-50 flex h-full flex-col overflow-hidden p-4">
									<div className="min-h-0 flex-1 overflow-y-auto">
										{previewConfig.enabled ? <PreviewCameraInspector /> : <SelectionInspector />}
									</div>
								</aside>
							</Panel>
						</Group>
					</Panel>

					<Separator className="border-base-300 h-px shrink-0 cursor-row-resize border-t" />

					<Panel defaultSize="280px" minSize="120px" maxSize="60%">
						<Timeline className="h-full" />
					</Panel>
				</Group>
			)}
		</main>
	);
};
