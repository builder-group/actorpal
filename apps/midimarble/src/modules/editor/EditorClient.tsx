import React from 'react';

const LazyEditor = React.lazy(async () => {
	const mod = await import('./Editor');
	return { default: mod.Editor };
});

export const EditorClient: React.FC = () => {
	return (
		<React.Suspense
			fallback={
				<main className="bg-base-100 grid h-screen place-items-center">
					<p className="text-base-700 text-sm">Loading editor...</p>
				</main>
			}
		>
			<LazyEditor />
		</React.Suspense>
	);
};
