// Root MIDI viewer component.
// Provides MidiCx + ViewportCx, then composes the sub-components.

import { useFeatureState, useListener } from 'feature-react';
import React, { useCallback, useRef, useState } from 'react';
import { MidiCxProvider, useMidiCx } from '../MidiCx';
import { ViewportCxProvider, useViewportCx } from '../ViewportCx';
import { PianoRoll } from './PianoRoll';
import { Ruler } from './Ruler';
import { Toolbar } from './Toolbar';
import { TrackPanel } from './TrackPanel';

export const MidiViewer: React.FC<TMidiViewerProps> = ({ style, className }) => (
	<MidiCxProvider>
		<ViewportCxProvider>
			<div
				className={`flex h-full w-full flex-col overflow-hidden ${className ?? ''}`}
				style={{ background: 'var(--color-base-0)', ...style }}
			>
				<InnerViewer />
			</div>
		</ViewportCxProvider>
	</MidiCxProvider>
);

// MARK: - Inner viewer (inside both providers)

const InnerViewer: React.FC = () => {
	const midiCx = useMidiCx();
	const viewportCx = useViewportCx();
	const song = useFeatureState(midiCx.$song);
	const isLoading = useFeatureState(midiCx.$isLoading);
	const error = useFeatureState(midiCx.$error);

	// Keep ViewportCx.ticksPerBeat in sync so zoomAtPoint math stays correct.
	useListener(
		midiCx.$song,
		({ value: s }) => { if (s != null) viewportCx.setSong(s.ticksPerBeat); },
		[midiCx, viewportCx]
	);

	if (song == null) return <DropZone isLoading={isLoading} error={error} />;

	return (
		<>
			<Toolbar />
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<TrackPanel />
				<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
					<Ruler onSeek={(tick) => midiCx.seekTo(tick)} />
					<PianoRoll />
				</div>
			</div>
		</>
	);
};

// MARK: - Drop zone

const DropZone: React.FC<TDropZoneProps> = ({ isLoading, error }) => {
	const midiCx = useMidiCx();
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files[0];
		if (file != null) void midiCx.loadFile(file);
	}, [midiCx]);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file != null) void midiCx.loadFile(file);
		e.target.value = '';
	}, [midiCx]);

	return (
		<div
			onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
			onClick={() => inputRef.current?.click()}
			className="m-3 flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg"
			style={{
				border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-base-200)'}`,
				background: isDragging ? 'color-mix(in srgb, var(--color-primary) 4%, transparent)' : 'transparent'
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
