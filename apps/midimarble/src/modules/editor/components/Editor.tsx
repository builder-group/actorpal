import { Link } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, FileUp, Plus, Save } from 'lucide-react';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useResource } from '@/modules/engine';
import { projectRepository } from '@/modules/persistence';
import { EditorCxProvider, useEditorCx } from '../EditorCx';
import { canCreateStraightTrack } from '../lib/scene-ui';
import { PreviewCameraInspector } from './PreviewCameraInspector';
import { SelectionInspector } from './SelectionInspector';
import { Timeline } from './Timeline';

export const Editor: React.FC<{ projectId?: string }> = ({ projectId }) => {
	return (
		<EditorCxProvider projectId={projectId}>
			<InnerEditor projectId={projectId} />
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
	const settings = useResource(app, 'audioSettings');
	const update = (patch: Partial<typeof settings>) => runtime.updateAudioSettings(patch);

	return (
		<section>
			<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">Audio</h3>
			<label className="text-base-700 mt-3 flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={settings.enabled}
					onChange={(e) => update({ enabled: e.target.checked })}
				/>
				Enabled
			</label>
			<label className="text-base-700 mt-3 block text-sm">
				Volume: {Math.round(settings.masterVolume * 100)}%
				<input
					type="range"
					min={0}
					max={100}
					value={Math.round(settings.masterVolume * 100)}
					className="mt-1 block w-full"
					onChange={(e) => update({ masterVolume: Number(e.target.value) / 100 })}
				/>
			</label>
		</section>
	);
};

const InnerEditor: React.FC<{ projectId?: string }> = ({ projectId }) => {
	const cx = useEditorCx();
	const app = cx.runtime.app;
	const [isAddMenuOpen, setIsAddMenuOpen] = React.useState(false);
	const [isProjectMenuOpen, setIsProjectMenuOpen] = React.useState(false);
	const [isImporting, setIsImporting] = React.useState(false);
	const [isSaving, setIsSaving] = React.useState(false);
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
	const [projectName, setProjectName] = React.useState(midiSong?.name ?? 'Untitled');
	const projectLabel = projectName;
	// Only show the "no MIDI" splash when there's no project context
	const needsMidiStart = projectId == null && (midiSong == null || selectedTrack == null);
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

	const handleNameSave = React.useCallback(
		async (name: string) => {
			if (projectId == null) return;
			const existing = await projectRepository.getProject(projectId);
			if (existing == null) return;
			await projectRepository.saveProject({ ...existing, name, updatedAt: Date.now() });
		},
		[projectId]
	);

	const handleSave = React.useCallback(async () => {
		if (projectId == null || isSaving) return;
		setIsSaving(true);
		try {
			const existing = await projectRepository.getProject(projectId);
			if (existing == null) return;
			const snapshot = cx.runtime.extractSnapshot();
			await projectRepository.saveProject({
				...snapshot,
				id: existing.id,
				name: projectName,
				createdAt: existing.createdAt,
				updatedAt: Date.now()
			});
		} finally {
			setIsSaving(false);
		}
	}, [projectId, isSaving, projectName, cx.runtime]);

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
											{/* Project name button — opens settings dropdown */}
											<div className="relative">
												<button
													type="button"
													className={`focus-visible:ring-base-300 pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium shadow-sm transition focus-visible:ring-2 focus-visible:outline-none ${
														isProjectMenuOpen
															? 'bg-base-100 text-base-900 border-base-300 border'
															: 'bg-base-0/90 text-base-700 border-base-200 hover:bg-base-100 border'
													}`}
													aria-pressed={isProjectMenuOpen}
													aria-label="Project menu"
													onClick={() => {
														setIsAddMenuOpen(false);
														setIsProjectMenuOpen((c) => !c);
													}}
												>
													<span className="max-w-48 truncate tracking-wide uppercase">
														{projectLabel}
													</span>
													<ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
												</button>

												{isProjectMenuOpen ? (
													<div className="bg-base-0 border-base-200 pointer-events-auto absolute top-full left-0 mt-2 w-64 rounded-lg border shadow-xl">
														<div className="p-1.5">
															<Link
																to="/"
																className="text-base-700 hover:bg-base-100 focus-visible:ring-base-300 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition focus-visible:ring-2 focus-visible:outline-none"
																onClick={() => setIsProjectMenuOpen(false)}
															>
																<ArrowLeft className="h-4 w-4 shrink-0" />
																<span>Back to Projects</span>
															</Link>
														</div>
														<div className="border-base-100 border-t" />
														<div className="flex flex-col gap-5 p-4">
															<section>
																<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">
																	Project
																</h3>
																<input
																	type="text"
																	value={projectName}
																	className="border-base-200 text-base-900 mt-3 w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none"
																	onChange={(e) => setProjectName(e.target.value)}
																	onBlur={(e) => void handleNameSave(e.target.value)}
																	onKeyDown={(e) => {
																		if (e.key === 'Enter') e.currentTarget.blur();
																	}}
																/>
															</section>
															<TrajectorySection />
															<AudioSection />
														</div>
													</div>
												) : null}
											</div>

											{/* Save */}
											{projectId != null ? (
												<button
													type="button"
													className="focus-visible:ring-base-300 border-base-200 bg-base-0/90 text-base-600 hover:bg-base-100 pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
													disabled={isSaving}
													aria-label={isSaving ? 'Saving…' : 'Save project'}
													title={isSaving ? 'Saving…' : 'Save'}
													onClick={() => void handleSave()}
												>
													<Save className="h-4 w-4" />
												</button>
											) : null}

											{/* Add scene element */}
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
														if (!canAddStraightTrack) return;
														setIsProjectMenuOpen(false);
														setIsAddMenuOpen((c) => !c);
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
										</div>
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
