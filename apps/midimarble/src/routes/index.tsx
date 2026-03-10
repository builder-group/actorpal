import { createFileRoute } from '@tanstack/react-router';
import { LazyEditor } from '@/modules/editor';

export const Route = createFileRoute('/')({ component: RouteComponent });

function RouteComponent() {
	return <LazyEditor />;
}
