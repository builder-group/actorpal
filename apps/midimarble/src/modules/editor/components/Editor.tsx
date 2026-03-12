import { With } from 'ecsify';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { MARBLE_SPAWN_POSITION, useResource } from '@/modules/engine';
import { MidiViewer } from '@/modules/midi';
import { EditorCxProvider, useEditorCx } from '../EditorCx';
import { useSceneSummary } from '../hooks';

export const Editor: React.FC = () => {
	return (
		<EditorCxProvider>
			<InnerEditor />
		</EditorCxProvider>
	);
};

const MarbleSection: React.FC = () => {
	const cx = useEditorCx();
	const app = cx.runtime.app;
	const scene = useSceneSummary();
	const pos = scene.leadMarblePosition;

	const resetMarble = () => {
		const marbleEids = [...app.queryEntities(With(app.c.MarbleMixin))];
		for (const eid of marbleEids) {
			const body = app.r.rigidBodies.get(eid);
			if (body == null) continue;
			body.setTranslation(MARBLE_SPAWN_POSITION, true);
			body.setLinvel({ x: 0, y: 0, z: 0 }, true);
			body.setAngvel({ x: 0, y: 0, z: 0 }, true);
			app.updateComponent(eid, app.c.PositionMixin, MARBLE_SPAWN_POSITION);
		}
		app.r.trajectoryState.pastPositions.length = 0;
	};

	return (
		<section>
			<h3 className="text-base-900 text-xs font-semibold tracking-wide uppercase">Marble</h3>
			<p className="text-base-600 mt-2 font-mono text-xs">
				{pos == null ? '—' : `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`}
			</p>
			<button
				onClick={resetMarble}
				disabled={!scene.physicsReady}
				className="mt-3 rounded-md bg-white px-3 py-1.5 text-xs shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-40"
			>
				Reset position
			</button>
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
				Future ticks: {config.futureTicks}
				<input
					type="range"
					min={10}
					max={500}
					value={config.futureTicks}
					className="mt-1 block w-full"
					onChange={(e) => update({ futureTicks: Number(e.target.value) })}
				/>
			</label>
			<label className="text-base-700 mt-3 block text-sm">
				Past ticks: {config.pastTicks}
				<input
					type="range"
					min={10}
					max={500}
					value={config.pastTicks}
					className="mt-1 block w-full"
					onChange={(e) => update({ pastTicks: Number(e.target.value) })}
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
					<MidiViewer className="h-full" />
				</Panel>
			</Group>
		</main>
	);
};
