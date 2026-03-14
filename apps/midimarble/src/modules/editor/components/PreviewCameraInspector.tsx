import React from 'react';
import { useResource } from '@/modules/engine';
import { useEditorCx } from '../EditorCx';

export const PreviewCameraInspector: React.FC<{
	showTitle?: boolean;
}> = ({ showTitle = true }) => {
	const runtime = useEditorCx().runtime;
	const config = useResource(runtime.app, 'previewConfig');

	return (
		<section>
			{showTitle ? (
				<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">
					Preview Camera
				</h3>
			) : null}

			<div className={showTitle ? 'mt-3' : ''}>
				<div className="border-base-200 bg-base-0 rounded-lg border px-3 py-3">
					<div className="mb-3">
						<p className="text-base-900 text-sm font-semibold">Preview Camera</p>
						<p className="text-base-500 mt-1 text-xs tracking-wide uppercase">
							Follow Marble
						</p>
					</div>

					<SliderField
						label="FOV"
						value={config.fov}
						min={20}
						max={90}
						step={1}
						onChange={(value) => runtime.updatePreviewConfig({ fov: value })}
					/>
					<SliderField
						label="Distance"
						value={config.distance}
						min={3}
						max={30}
						step={0.1}
						onChange={(value) => runtime.updatePreviewConfig({ distance: value })}
					/>
					<SliderField
						label="Height"
						value={config.height}
						min={-8}
						max={8}
						step={0.1}
						onChange={(value) => runtime.updatePreviewConfig({ height: value })}
					/>
					<SliderField
						label="Look Ahead"
						value={config.lookAhead}
						min={-8}
						max={8}
						step={0.1}
						onChange={(value) => runtime.updatePreviewConfig({ lookAhead: value })}
					/>
					<SliderField
						label="Smoothing"
						value={config.smoothing}
						min={0.02}
						max={0.4}
						step={0.01}
						onChange={(value) => runtime.updatePreviewConfig({ smoothing: value })}
					/>
				</div>
			</div>
		</section>
	);
};

const SliderField: React.FC<{
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
}> = ({ label, value, min, max, step, onChange }) => (
	<label className="mt-3 block first:mt-0">
		<div className="flex items-baseline justify-between gap-4">
			<span className="text-base-500 text-xs tracking-wide uppercase">{label}</span>
			<span className="text-base-800 font-mono text-sm">{value.toFixed(step >= 1 ? 0 : 2)}</span>
		</div>
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			className="mt-1 block w-full"
			onChange={(event) => onChange(Number(event.target.value))}
		/>
	</label>
);
