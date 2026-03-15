import { useFeatureState } from 'feature-react';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
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
					className={`bg-base-0 flex h-full w-full flex-col overflow-hidden ${className ?? ''}`.trim()}
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

	const song = useFeatureState(midiFileCx.$song);
	const isLoading = useFeatureState(midiFileCx.$isLoading);
	const error = useFeatureState(midiFileCx.$error);

	// MARK: - UI

	if (song == null) {
		return <MidiEmptyState error={error} isLoading={isLoading} />;
	}

	return (
		<>
			<MidiToolbar />
			<Group className="min-h-0 flex-1 overflow-hidden">
				<Panel defaultSize="140px" minSize="100px" maxSize="300px">
					<MidiSidebar />
				</Panel>
				<Separator className="border-base-100 w-px shrink-0 cursor-col-resize border-r" />
				<Panel>
					<div className="flex h-full min-w-0 flex-col overflow-hidden">
						<MidiTimeline />
						<MidiPianoRoll />
					</div>
				</Panel>
			</Group>
		</>
	);
};

const MidiEmptyState: React.FC<TMidiEmptyStateProps> = ({ error, isLoading }) => {
	const midiFileCx = useMidiFileCx();

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

	// MARK: - UI

	return (
		<div className="flex flex-1 items-center justify-center p-3">
			<div
				className={`flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center ${
					isDragging ? 'border-primary bg-base-50' : 'border-base-200 bg-transparent'
				}`}
				onClick={handleOpenFilePicker}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{isLoading ? (
					<span className="text-base-400 text-[11px]">Parsing...</span>
				) : (
					<>
						<span className="text-xl">🎹</span>
						<p className="text-base-500 text-[11px]">Drop a MIDI file or click to open</p>
						<p className="text-base-400 text-[10px]">
							Compact piano roll viewer for the marble workflow
						</p>
						{error != null && <p className="text-error text-[10px]">{error}</p>}
					</>
				)}

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
