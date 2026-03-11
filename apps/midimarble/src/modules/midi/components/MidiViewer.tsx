// Root MIDI viewer component.
// Provides MidiCx + TimelineCx, then composes the sub-components.
// Drop zone shown when no song is loaded; piano roll when a song is ready.

import React, { useCallback, useRef, useState } from 'react';
import { useFeatureState } from 'feature-react';
import { MidiCxProvider, useMidiCx } from '../MidiCx';
import { TimelineCxProvider } from '../TimelineCx';
import { Toolbar } from './Toolbar';
import { TrackPanel } from './TrackPanel';
import { NoteRuler } from './NoteRuler';
import { NoteGrid } from './NoteGrid';

export const MidiViewer: React.FC<TMidiViewerProps> = (props) => {
	const { style, className } = props;

	return (
		<MidiCxProvider>
			<TimelineCxProvider>
				<div
					className={className}
					style={{
						display: 'flex',
						flexDirection: 'column',
						width: '100%',
						height: '100%',
						background: 'var(--color-base-0)',
						overflow: 'hidden',
						...style,
					}}
				>
					<InnerViewer />
				</div>
			</TimelineCxProvider>
		</MidiCxProvider>
	);
};

// MARK: - Inner (inside both providers)

const InnerViewer: React.FC = () => {
	const midiCx = useMidiCx();
	const song = useFeatureState(midiCx.$song);
	const isLoading = useFeatureState(midiCx.$isLoading);
	const error = useFeatureState(midiCx.$error);

	if (song == null) {
		return <DropZone isLoading={isLoading} error={error} />;
	}

	return (
		<>
			<Toolbar />
			{/* Main row: track panel | ruler + grid */}
			<div className="flex flex-1 overflow-hidden min-h-0">
				<div style={{ width: 140, flexShrink: 0 }}>
					<TrackPanel />
				</div>
				<div className="flex flex-col flex-1 overflow-hidden min-w-0">
					<NoteRuler onSeek={(tick) => midiCx.seekTo(tick)} />
					<NoteGrid />
				</div>
			</div>
		</>
	);
};

// MARK: - Drop zone

const DropZone: React.FC<TDropZoneProps> = (props) => {
	const { isLoading, error } = props;
	const midiCx = useMidiCx();
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file != null) void midiCx.loadFile(file);
		},
		[midiCx],
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file != null) void midiCx.loadFile(file);
		},
		[midiCx],
	);

	return (
		<div
			onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
			onClick={() => inputRef.current?.click()}
			className="flex-1 flex flex-col items-center justify-center gap-2 m-3 rounded-lg cursor-pointer"
			style={{
				border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-base-200)'}`,
				background: isDragging ? 'color-mix(in srgb, var(--color-primary) 4%, transparent)' : 'transparent',
			}}
		>
			{isLoading ? (
				<span className="text-[11px]" style={{ color: 'var(--color-base-400)' }}>Parsing…</span>
			) : (
				<>
					<span className="text-xl">🎹</span>
					<span className="text-[11px]" style={{ color: 'var(--color-base-400)' }}>
						Drop a MIDI file or click to open
					</span>
					{error != null && (
						<span className="text-[10px]" style={{ color: 'var(--color-error)' }}>{error}</span>
					)}
				</>
			)}
			<input ref={inputRef} type="file" accept=".mid,.midi" className="hidden" onChange={handleChange} />
		</div>
	);
};

// MARK: - Types

interface TMidiViewerProps {
	style?: React.CSSProperties;
	className?: string;
}

interface TDropZoneProps {
	isLoading: boolean;
	error: string | null;
}
