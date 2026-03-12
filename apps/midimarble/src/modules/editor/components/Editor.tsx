import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
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

const InnerEditor: React.FC = () => {
	const cx = useEditorCx();
	const scene = useSceneSummary();

	return (
		<main className="bg-base-100 h-screen overflow-hidden">
			<Group orientation="vertical" className="h-full">
				<Panel>
					<div className="flex h-full">
						<section className="border-base-300 relative min-h-0 flex-1 border-r">
							<div ref={cx.setContainer} className="h-full w-full" />
							<div className="bg-base-0/85 text-base-700 pointer-events-none absolute top-3 left-3 rounded-md px-3 py-1.5 text-xs">
								ECSify + Three.js + Rapier scene
							</div>
						</section>

						<aside className="border-base-300 bg-base-50 w-80 overflow-y-auto p-4">
							<h2 className="text-base-900 text-sm font-semibold">Inspector</h2>
							<p className="text-base-700 mt-2 text-sm">
								React is currently used for UI panels only.
							</p>
							<ul className="text-base-700 mt-4 list-disc space-y-1 pl-5 text-sm">
								<li>Entities render from `Position + Rotation + Scale + Mesh(kind)`</li>
								<li>Rapier rigid bodies sync into ECS transforms on a fixed timestep</li>
								<li>Pegboard and track pieces are normal scene entities, not renderer refs</li>
							</ul>
							<p className="text-base-700 mt-4 text-sm">
								Scene entities: {scene.entityCount}
							</p>
							<p className="text-base-700 mt-2 text-sm">
								Pegboards: {scene.pegboardCount} | Straight tracks:{' '}
								{scene.straightTrackCount}
							</p>
							<p className="text-base-700 mt-2 text-sm">Marbles: {scene.marbleCount}</p>
							<p className="text-base-700 mt-2 text-sm">
								Physics: {scene.physicsReady ? 'ready' : 'loading Rapier...'}
							</p>
							<p className="text-base-700 mt-2 text-sm">
								Lead marble:{' '}
								{scene.leadMarblePosition == null
									? 'N/A'
									: `${scene.leadMarblePosition.x.toFixed(2)}, ${scene.leadMarblePosition.y.toFixed(2)}, ${scene.leadMarblePosition.z.toFixed(2)}`}
							</p>
						</aside>
					</div>
				</Panel>

				<Separator className="border-base-300 h-px shrink-0 cursor-row-resize border-t" />

				<Panel defaultSize="280px" minSize="120px" maxSize="60%">
					<MidiViewer style={{ height: '100%' }} />
				</Panel>
			</Group>
		</main>
	);
};
