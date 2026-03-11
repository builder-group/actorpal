import React from 'react';
import { MidiViewer } from '@/modules/midi';
import { EditorCxProvider, useEditorCx } from '../EditorCx';
import { useSceneSummary } from '../hooks';

const MIDI_PANEL_HEIGHT = 280;

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
		<main
			className="bg-base-100"
			style={{
				display: 'grid',
				height: '100vh',
				gridTemplateColumns: '1fr 320px',
				gridTemplateRows: `1fr ${MIDI_PANEL_HEIGHT}px`
			}}
		>
			<section className="border-base-300 relative min-h-0 border-r">
				<div ref={cx.setContainer} className="h-full w-full" />
				<div className="bg-base-0/85 text-base-700 pointer-events-none absolute top-3 left-3 rounded-md px-3 py-1.5 text-xs">
					ECSify + Three.js + Rapier scene
				</div>
			</section>

			<aside className="border-base-300 bg-base-50 min-h-0 overflow-y-auto border-b p-4">
				<h2 className="text-base-900 text-sm font-semibold">Inspector</h2>
				<p className="text-base-700 mt-2 text-sm">React is currently used for UI panels only.</p>
				<ul className="text-base-700 mt-4 list-disc space-y-1 pl-5 text-sm">
					<li>Entities render from `Position + Rotation + Scale + Mesh(kind)`</li>
					<li>Rapier rigid bodies sync into ECS transforms on a fixed timestep</li>
					<li>Pegboard and track pieces are normal scene entities, not renderer refs</li>
				</ul>
				<p className="text-base-700 mt-4 text-sm">Scene entities: {scene.entityCount}</p>
				<p className="text-base-700 mt-2 text-sm">
					Pegboards: {scene.pegboardCount} | Straight tracks: {scene.straightTrackCount}
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

			{/* MIDI viewer — spans both columns */}
			<footer
				className="border-base-300 border-t"
				style={{ gridColumn: '1 / -1', minHeight: 0, overflow: 'hidden' }}
			>
				<MidiViewer style={{ height: '100%' }} />
			</footer>
		</main>
	);
};
