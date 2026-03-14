import React from 'react';
import { FileUp, SlidersHorizontal, X } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useResource } from '@/modules/engine';
import { EditorCxProvider, useEditorCx } from '../EditorCx';
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
	const app = useEditorCx().runtime.app;
	const config = useResource(app, 'trajectoryConfig');
	const update = (patch: Partial<typeof config>) =>
		app.updateResource('trajectoryConfig', { ...config, ...patch });

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
	const app = useEditorCx().runtime.app;
	const config = useResource(app, 'audioConfig');
	const state = useResource(app, 'audioState');
	const update = (patch: Partial<typeof config>) =>
		app.updateResource('audioConfig', { ...config, ...patch });

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
	const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
	const [isImporting, setIsImporting] = React.useState(false);
	const midiSong = useResource(app, 'midiSong');
	const selectedTrackId = useResource(app, 'selectedTrackId');
	const midiImportError = useResource(app, 'midiImportError');
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const selectedTrack = React.useMemo(
		() => midiSong?.tracks.find((track) => track.id === selectedTrackId) ?? null,
		[midiSong, selectedTrackId]
	);
	const songLabel = midiSong?.name ?? 'No MIDI';
	const needsMidiStart = midiSong == null || selectedTrack == null;

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
										<button
											type="button"
											className={`pointer-events-auto border-base-200 hover:bg-base-100 bg-base-0/90 inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition ${
												isSettingsOpen ? 'bg-base-900 text-base-0 border-base-900 hover:bg-base-900' : 'text-base-600'
											}`}
											aria-pressed={isSettingsOpen}
											aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
											title={isSettingsOpen ? 'Close settings' : 'Open settings'}
											onClick={() => setIsSettingsOpen((current) => !current)}
										>
											<SlidersHorizontal className="h-4 w-4" />
										</button>
									</div>

									{isSettingsOpen ? (
										<div className="pointer-events-auto bg-base-0 border-base-200 mt-2 w-max min-w-full max-w-[min(22rem,calc(100vw-2rem))] rounded-lg border p-4 shadow-xl">
											<div className="mb-4 flex items-center justify-between gap-3">
												<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">
													Settings
												</h3>
												<button
													type="button"
													className="border-base-200 text-base-500 hover:bg-base-100 inline-flex h-8 w-8 items-center justify-center rounded-md border transition"
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
								<h2 className="text-base-900 mb-4 text-xs font-semibold tracking-wide uppercase">
									Inspector
								</h2>
								<div className="min-h-0 flex-1 overflow-y-auto">
									<SelectionInspector showTitle={false} />
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
