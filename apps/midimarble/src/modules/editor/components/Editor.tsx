import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useResource } from '@/modules/engine';
import { EditorCxProvider, useEditorCx } from '../EditorCx';
import { useMarble } from '../hooks';
import { Timeline } from './Timeline';

export const Editor: React.FC = () => {
	return (
		<EditorCxProvider>
			<InnerEditor />
		</EditorCxProvider>
	);
};

const MarbleSection: React.FC = () => {
	const marble = useMarble();
	const pos = marble.position;

	return (
		<section>
			<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">Marble</h3>
			<p className="text-base-600 mt-2 font-mono text-xs">
				{pos == null ? '—' : `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`}
			</p>
		</section>
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
			<label className="text-base-700 mt-3 block text-sm">
				Future steps: {config.futureSteps}
				<input
					type="range"
					min={10}
					max={500}
					value={config.futureSteps}
					className="mt-1 block w-full"
					onChange={(e) => update({ futureSteps: Number(e.target.value) })}
				/>
			</label>
			<label className="text-base-700 mt-3 block text-sm">
				Past steps: {config.pastSteps}
				<input
					type="range"
					min={10}
					max={500}
					value={config.pastSteps}
					className="mt-1 block w-full"
					onChange={(e) => update({ pastSteps: Number(e.target.value) })}
				/>
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

const InnerEditor: React.FC = () => {
	const cx = useEditorCx();

	return (
		<main className="bg-base-100 h-screen overflow-hidden">
			<Group orientation="vertical" className="h-full">
				<Panel>
					<Group className="h-full">
						<Panel>
							<section className="border-base-300 relative h-full min-w-0 overflow-hidden border-r">
								<div ref={cx.setContainer} className="h-full w-full" />
								<div className="bg-base-0/85 text-base-700 pointer-events-none absolute top-3 left-3 rounded-md px-3 py-1.5 text-xs">
									ECSify + Three.js + Rapier scene
								</div>
							</section>
						</Panel>

						<Separator className="border-base-300 w-px shrink-0 cursor-col-resize border-r" />

						<Panel defaultSize="320px" minSize="200px" maxSize="500px">
							<aside className="bg-base-50 flex h-full flex-col gap-6 overflow-y-auto p-4">
								<MarbleSection />
								<hr className="border-base-200" />
								<TrajectorySection />
							</aside>
						</Panel>
					</Group>
				</Panel>

				<Separator className="border-base-300 h-px shrink-0 cursor-row-resize border-t" />

				<Panel defaultSize="280px" minSize="120px" maxSize="60%">
					<Timeline className="h-full" />
				</Panel>
			</Group>
		</main>
	);
};
