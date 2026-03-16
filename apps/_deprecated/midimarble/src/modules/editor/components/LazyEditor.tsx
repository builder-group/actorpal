import React from 'react';

const EditorComponent = React.lazy(async () => {
	const mod = await import('./Editor');
	return { default: mod.Editor };
});

export const LazyEditor: React.FC = () => {
	const [isMounted, setIsMounted] = React.useState(false);

	React.useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return <Fallback />;
	}

	return (
		<React.Suspense fallback={<Fallback />}>
			<EditorComponent />
		</React.Suspense>
	);
};

const Fallback: React.FC = () => {
	return (
		<main className="bg-base-100 grid h-screen place-items-center">
			<p className="text-base-700 text-sm">Loading editor...</p>
		</main>
	);
};
