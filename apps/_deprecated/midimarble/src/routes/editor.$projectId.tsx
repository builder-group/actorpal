import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

const LazyEditorWithProject = React.lazy(async () => {
	const mod = await import('@/modules/editor/components/Editor');
	return { default: mod.Editor };
});

export const Route = createFileRoute('/editor/$projectId')({
	component: RouteComponent
});

function RouteComponent() {
	const { projectId } = Route.useParams();
	const [isMounted, setIsMounted] = React.useState(false);
	React.useEffect(() => {
		setIsMounted(true);
	}, []);
	if (!isMounted) return <Fallback />;
	return (
		<React.Suspense fallback={<Fallback />}>
			<LazyEditorWithProject projectId={projectId} />
		</React.Suspense>
	);
}

const Fallback: React.FC = () => (
	<main className="bg-base-100 grid h-screen place-items-center">
		<p className="text-base-700 text-sm">Loading editor…</p>
	</main>
);
