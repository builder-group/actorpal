import { useFeatureState } from 'feature-react';
import { FileMusic, Upload } from 'lucide-react';
import React from 'react';
import { useMidiFileCx } from '../MidiFileCx';

export const MidiEmptyState: React.FC = () => {
	const midiFileCx = useMidiFileCx();
	const isLoading = useFeatureState(midiFileCx.$isLoading);
	const error = useFeatureState(midiFileCx.$error);

	const inputRef = React.useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = React.useState(false);

	const loadFile = React.useCallback(
		(file: File | null | undefined) => {
			if (file != null) {
				void midiFileCx.loadFile(file);
			}
		},
		[midiFileCx]
	);

	return (
		<div className="bg-base-50 flex flex-1 items-center justify-center p-8">
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={(event) => {
					event.preventDefault();
					setIsDragging(false);
					loadFile(event.dataTransfer.files[0]);
				}}
				className="border-base-300 bg-base-0 hover:border-base-400 flex w-full max-w-xl flex-col items-center gap-4 rounded-[28px] border border-dashed px-8 py-14 text-center transition-colors"
				style={{
					borderColor: isDragging ? 'var(--color-primary)' : undefined,
					background: isDragging
						? 'color-mix(in srgb, var(--color-primary) 4%, white)'
						: 'color-mix(in srgb, var(--color-base-0) 88%, white)'
				}}
			>
				<div className="bg-base-100 text-base-800 grid h-16 w-16 place-items-center rounded-2xl">
					{isLoading ? <Upload className="animate-pulse" size={24} /> : <FileMusic size={24} />}
				</div>
				<div className="space-y-2">
					<h2 className="text-base-950 text-lg font-semibold">Open a MIDI file</h2>
					<p className="text-base-600 text-sm">
						Drop a `.mid` or `.midi` file here, or click to browse. `midi-v3` is isolated from the
						older viewers.
					</p>
				</div>
				{error != null && <p className="text-error text-sm">{error}</p>}
				<input
					ref={inputRef}
					type="file"
					accept=".mid,.midi"
					className="hidden"
					onChange={(event) => {
						loadFile(event.target.files?.[0]);
						event.target.value = '';
					}}
				/>
			</button>
		</div>
	);
};
