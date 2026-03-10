import React from 'react';
import { EditorCxProvider, useEditorCx } from '../EditorCx';
import { useCubeRotation } from '../hooks';

export const Editor: React.FC = () => {
	return (
		<EditorCxProvider>
			<InnerEditor />
		</EditorCxProvider>
	);
};

const InnerEditor: React.FC = () => {
	const cx = useEditorCx();
	const cubeRotation = useCubeRotation();

	return (
		<main className="bg-base-100 grid h-screen grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_320px]">
			<section className="border-base-300 relative min-h-0 border-b lg:border-r lg:border-b-0">
				<div ref={cx.setContainer} className="h-full w-full" />
				<div className="bg-base-0/85 text-base-700 pointer-events-none absolute top-3 left-3 rounded-md px-3 py-1.5 text-xs">
					ECSify + native Three.js viewport
				</div>
			</section>

			<aside className="border-base-300 bg-base-50 hidden min-h-0 border-b p-4 lg:block">
				<h2 className="text-base-900 text-sm font-semibold">Inspector</h2>
				<p className="text-base-700 mt-2 text-sm">React is currently used for UI panels only.</p>
				<ul className="text-base-700 mt-4 list-disc space-y-1 pl-5 text-sm">
					<li>ECS app with core and render modules</li>
					<li>Core system updates rotation every frame</li>
					<li>Render module draws a rotating cube</li>
				</ul>
				<p className="text-base-700 mt-4 text-sm">
					Cube rotation:{' '}
					{cubeRotation == null
						? 'N/A'
						: `${cubeRotation.x.toFixed(2)}, ${cubeRotation.y.toFixed(2)}, ${cubeRotation.z.toFixed(2)}`}
				</p>
			</aside>

			<footer className="border-base-300 bg-base-0 col-span-1 border-t px-4 py-3 lg:col-span-2">
				<div className="text-base-700 flex items-center gap-3 text-sm">
					<span className="text-base-900 font-medium">Timeline</span>
					<div className="bg-base-200 h-1 flex-1 rounded-full">
						<div className="bg-primary h-1 w-16 rounded-full" />
					</div>
					<span>0:00 / 0:00</span>
				</div>
			</footer>
		</main>
	);
};
