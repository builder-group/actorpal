import { useFeatureState } from 'feature-react';
import React from 'react';
import { MidiFileCxProvider, useMidiFileCx } from '../MidiFileCx';
import { MidiViewportCxProvider } from '../MidiViewportCx';
import { MidiPianoRoll } from './MidiPianoRoll';
import { MidiSidebar } from './MidiSidebar';
import { MidiTimeline } from './MidiTimeline';
import { MidiToolbar } from './MidiToolbar';

export const MidiViewer: React.FC<TMidiViewerProps> = ({ className, style }) => {
	return (
		<MidiFileCxProvider>
			<MidiViewportCxProvider>
				<section
					className={`bg-base-0 flex h-full w-full overflow-hidden ${className ?? ''}`.trim()}
					style={style}
				>
					<InnerMidiViewer />
				</section>
			</MidiViewportCxProvider>
		</MidiFileCxProvider>
	);
};

const InnerMidiViewer: React.FC = () => {
	const midiFileCx = useMidiFileCx();

	// MARK: - State and Memos

	const song = useFeatureState(midiFileCx.$song);
	const isLoading = useFeatureState(midiFileCx.$isLoading);
	const error = useFeatureState(midiFileCx.$error);

	// MARK: - UI

	if (song == null) {
		return <MidiEmptyState error={error} isLoading={isLoading} />;
	}

	return (
		<>
			<MidiSidebar />
			<div className="flex min-w-0 flex-1 flex-col">
				<MidiToolbar />
				<MidiTimeline />
				<MidiPianoRoll />
			</div>
		</>
	);
};

const MidiEmptyState: React.FC<TMidiEmptyStateProps> = ({ error, isLoading }) => {
	const midiFileCx = useMidiFileCx();

	// MARK: - State and Memos

	const [isDragging, setIsDragging] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);

	// MARK: - Actions

	const handleOpenFilePicker = React.useCallback(() => {
		inputRef.current?.click();
	}, []);

	const handleDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = React.useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleDrop = React.useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsDragging(false);
			const file = event.dataTransfer.files[0];
			if (file != null) {
				void midiFileCx.loadFile(file);
			}
		},
		[midiFileCx]
	);

	// MARK: - Effects

	// MARK: - UI

	return (
		<div className="bg-base-50 flex flex-1 items-center justify-center p-4">
			<div
				className="w-full max-w-[440px] cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center"
				style={{
					borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-base-200)',
					background: isDragging
						? 'color-mix(in srgb, var(--color-primary) 4%, white)'
						: 'color-mix(in srgb, var(--color-base-0) 92%, white)',
				}}
				onClick={handleOpenFilePicker}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				<div
					className="bg-base-100 text-base-500 mx-auto mb-3 flex size-10 items-center justify-center rounded-full"
					style={{ background: 'color-mix(in srgb, var(--color-base-100) 70%, white)' }}
				>
					&#9835;
				</div>

				<p className="text-base-700 text-sm font-semibold">
					{isLoading ? 'Parsing MIDI...' : 'Drop a MIDI file'}
				</p>
				<p className="text-base-500 mt-2 text-xs">
					Compact piano-roll preview for the marble timeline workflow.
				</p>
				<p className="text-base-400 mt-1 text-xs">
					Ctrl/Cmd + wheel zooms at the cursor. Click the ruler to seek.
				</p>

				<button type="button" className="bg-base-100 text-base-700 mt-5 rounded px-3 py-1.5 text-xs font-semibold">
					Open `.mid` or `.midi`
				</button>

				{error != null && <p className="text-error mt-3 text-xs">{error}</p>}

				<input
					ref={inputRef}
					type="file"
					accept=".mid,.midi"
					className="hidden"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file != null) {
							void midiFileCx.loadFile(file);
						}
						event.target.value = '';
					}}
				/>
			</div>
		</div>
	);
};

interface TMidiViewerProps {
	className?: string;
	style?: React.CSSProperties;
}

interface TMidiEmptyStateProps {
	error: string | null;
	isLoading: boolean;
}
